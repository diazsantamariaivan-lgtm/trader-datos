import json,glob,numpy as np,warnings;warnings.filterwarnings('ignore')
fs=glob.glob('/tmp/hh/h/*.json');S=[]
for f in fs:
    try:d=json.load(open(f))
    except:continue
    c=np.array(d['c'],float)
    if len(c)<400 or c[len(c)//2]<=1 or np.isnan(c).any():continue
    S.append({k:np.array(d[k],float) for k in 'tohlc'})
days=sorted({int(x)//86400 for s in S for x in s['t']});ix={t:i for i,t in enumerate(days)};T=len(days);N=len(S)
print('dias',T,'acciones',N)
def sma(a,w):
    o=np.full(len(a),np.nan);cs=np.cumsum(a);o[w-1:]=(cs[w-1:]-np.concatenate(([0],cs[:-w])))/w;return o
def rsi(a,w=14):
    d=np.diff(a,prepend=a[0]);up=np.maximum(d,0);dn=np.maximum(-d,0);o=np.full(len(a),np.nan)
    au=up[1:w+1].mean();ad=dn[1:w+1].mean()
    for t in range(w,len(a)):
        if t>w:au=(au*(w-1)+up[t])/w;ad=(ad*(w-1)+dn[t])/w
        o[t]=100 if ad==0 else 100-100/(1+au/ad)
    return o
def rollmin(a,w):return np.array([np.nan]*(w-1)+[a[i-w+1:i+1].min() for i in range(w-1,len(a))])
def rollmax_prev(a,w):return np.array([np.nan]*w+[a[i-w:i].max() for i in range(w,len(a))])
H=(5,10,20);F={h:np.full((T,N),np.nan) for h in H};SG={k:np.zeros((T,N),bool) for k in 'ABCEG'}
ab50=np.full((T,N),np.nan)
for j,s in enumerate(S):
    c=s['c'];h=s['h'];l=s['l'];ti=np.array([ix[int(x)//86400] for x in s['t']]);n=len(c)
    r=rsi(c);s20=sma(c,20);s50=sma(c,50);s200=sma(c,200)
    rm=rollmin(r,10);low5=rollmin(l,5);low20p=np.array([np.nan]*25+[l[i-24:i-4].min() for i in range(25,n)]);hi10=rollmax_prev(h,10)
    ab50[ti,j]=np.where(np.isnan(s50),np.nan,(c>s50).astype(float))
    for hh in H:
        f=np.full(n,np.nan);f[:-hh]=c[hh:]/c[:-hh]-1;F[hh][ti,j]=f
    c3=np.concatenate(([np.nan]*3,c[:-3]));r3=np.concatenate(([np.nan]*3,r[:-3]))
    ok=~np.isnan(s200)&~np.isnan(r)&~np.isnan(low20p)&~np.isnan(hi10)
    A=ok&(r<30);B=ok&(rm<30)&(r>r3)&(low5>low20p)&(c>c3);C=B&(c>hi10)
    E=ok&(c>s50)&(s50>s200)&(r>50)&(r<70)
    for k,m in zip('ABCE',(A,B,C,E)):SG[k][ti,j]=m
    SG['G'][ti,j]=ok
br=np.nanmean(ab50,axis=1)
months=np.array([int(d//30.4) for d in days])
cost=0.002
def rep(name,m,h):
    mm=m&~np.isnan(F[h]);allm=np.nanmean(F[h],axis=1)
    ex=np.full(T,np.nan)
    for t in range(T):
        if mm[t].sum()>0:ex[t]=np.nanmean(F[h][t][mm[t]])-allm[t]
    ms=sorted(set(months[~np.isnan(ex)]));em=np.array([np.nanmean(ex[months==q]) for q in ms])
    if len(em)<6:print(name.ljust(60),'pocas operaciones');return
    t_=em.mean()/(em.std(ddof=1)/np.sqrt(len(em)))
    raw=np.nanmean(F[h][mm])
    print(name.ljust(60),'ops',str(mm.sum()).rjust(8),'| por operacion',f'{(raw-cost)*100:6.2f}%','| frente al resto',f'{(np.nanmean(em)-cost)*100:6.2f}%','| t(meses)',f'{t_:5.2f}',f'| meses+ {np.mean(em>cost)*100:3.0f}%')
for h in H:
    print('\n=== mantener',h,'dias (coste 0,2 % ida y vuelta) ===')
    print('todas las acciones (base):',f'{np.nanmean(F[h])*100:.2f}%')
    rep('A  RSI<30 comprar el suelo a ciegas',SG['A'],h)
    rep('B  suelo confirmado (RSI<30 antes, sin nuevo minimo, rebota)',SG['B'],h)
    rep('C  B + rompe el maximo de 10 dias',SG['C'],h)
    rep('D  C + mercado amplio (>40% sobre su media 50d)',SG['C']&(br[:,None]>0.40),h)
    rep('D2 C + mercado NO amplio (<=40%)',SG['C']&(br[:,None]<=0.40),h)
    rep('E  tendencia alcista fuerte (50d>200d, RSI 50-70)',SG['E'],h)
    rep('F  E + mercado amplio (>55%)',SG['E']&(br[:,None]>0.55),h)
    rep('G  cualquier accion cuando el mercado es amplio (>55%)',SG['G']&(br[:,None]>0.55),h)
    rep('H  cualquier accion cuando el mercado es debil (<35%)',SG['G']&(br[:,None]<0.35),h)
mid=T//2
print('\n=== C a 10 dias, por mitades del periodo ===')
for nm,sl in (('primera mitad',slice(0,mid)),('segunda mitad',slice(mid,T))):
    m=np.zeros((T,N),bool);m[sl]=SG['C'][sl];rep(nm,m,10)
print('\n=== H (mercado debil) a 20 dias: cuantos episodios y por anios ===')
import datetime
yr=np.array([ (datetime.date(1970,1,1)+datetime.timedelta(days=int(d))).year for d in days])
bs=br<0.35;print('dias con mercado debil',bs.sum(),'de',T)
for y in sorted(set(yr[bs])):
    m=np.zeros((T,N),bool);sel=bs&(yr==y);m[sel]=SG['G'][sel]
    mm=m&~np.isnan(F[20])
    if mm.sum()>0:print(y,'dias',sel.sum(),'| 20d por operacion',f'{(np.nanmean(F[20][mm])-cost)*100:6.2f}%','| base ese anio',f'{(np.nanmean(F[20][yr==y])-cost)*100:6.2f}%')
