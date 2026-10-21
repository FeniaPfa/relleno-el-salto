import sys,re,fitz
d=fitz.open(sys.argv[1])
ini=int(sys.argv[2]) if len(sys.argv)>2 else 0
fin=int(sys.argv[3]) if len(sys.argv)>3 else d.page_count
print('### PÁGINAS TOTALES:',d.page_count)
for i in range(ini,min(fin,d.page_count)):
    t=re.sub(r'\n{3,}','\n\n',d[i].get_text()).strip()
    if t: print('\n===== p.%d ====='%(i+1)); print(t)
