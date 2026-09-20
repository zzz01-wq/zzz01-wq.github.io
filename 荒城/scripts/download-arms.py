import urllib.request,urllib.parse,http.cookiejar,re,json,pathlib,zipfile
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));opener.addheaders=[('User-Agent','Mozilla/5.0')]
url='https://wriks.itch.io/wrad-arms'
s=opener.open(url,timeout=40).read().decode()
csrf=re.search(r'name="csrf_token" value="([^"]+)',s).group(1)
request=urllib.request.Request(url+'/download_url',data=urllib.parse.urlencode({'csrf_token':csrf}).encode(),headers={'Referer':url,'X-Requested-With':'XMLHttpRequest'})
r=json.load(opener.open(request,timeout=40))
page=opener.open(r['url'],timeout=40).read().decode();pathlib.Path('/tmp/huangcheng-arms-download.html').write_text(page)
links=re.findall(r'href="([^"]+)"[^>]*class="[^"]*download',page)
uploads=re.findall(r'data-upload_id="(\d+)"',page)
print('Download page available; file IDs:',uploads,'links:',len(links))
csrf=re.search(r'name="csrf_token" value="([^"]+)',page).group(1)
request=urllib.request.Request(url+'/file/'+uploads[0],data=urllib.parse.urlencode({'csrf_token':csrf}).encode(),headers={'Referer':r['url'],'X-Requested-With':'XMLHttpRequest'})
file=json.load(opener.open(request,timeout=40))
data=opener.open(file['url'],timeout=60).read()
pathlib.Path('/tmp/huangcheng-arms.zip').write_bytes(data)
with zipfile.ZipFile('/tmp/huangcheng-arms.zip') as archive:
 print(archive.namelist());archive.extractall('/tmp/huangcheng-arms')
