export function launchVideoSource(value){
 if(!value?.trim())return {kind:'placeholder'};
 let u;try{u=new URL(value)}catch{return {kind:'invalid'}}
 if(u.protocol!=='https:'||u.username||u.password)return {kind:'invalid'};
 const host=u.hostname.toLowerCase().replace(/^www\./,''),path=u.pathname.split('/').filter(Boolean);
 if(['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)){
  const id=host==='youtu.be'?path[0]:['embed','shorts','live'].includes(path[0])?path[1]:u.searchParams.get('v');
  if(!/^[\w-]{11}$/.test(id??''))return {kind:'invalid'};
  const autoplayOnLoad=u.searchParams.get('autoplay')==='1'&&u.searchParams.get('mute')==='1';
  const src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  return autoplayOnLoad
   ?{kind:'embed',src:src+'&mute=1',provider:'YouTube',autoplayOnLoad}
   :{kind:'embed',src,provider:'YouTube'};
 }
 if(['vimeo.com','player.vimeo.com'].includes(host)){
  const id=path[0]==='video'?path[1]:path[0];if(!/^\d+$/.test(id??''))return {kind:'invalid'};
  const url=new URL('https://player.vimeo.com/video/'+id);
  const hash=u.searchParams.get('h')??(path[0]!=='video'?path[1]:null);
  if(hash&&/^[a-f0-9]+$/i.test(hash))url.searchParams.set('h',hash);
  for(const key of ['autopause','muted']){
   const value=u.searchParams.get(key);
   if(value==='0'||value==='1')url.searchParams.set(key,value);
  }
  for(const key of ['player_id','app_id']){
   const value=u.searchParams.get(key);
   if(value&&/^\d+$/.test(value))url.searchParams.set(key,value);
  }
  url.searchParams.set('autoplay','1');
  const autoplayOnLoad=u.searchParams.get('autoplay')==='1'&&url.searchParams.get('muted')==='1';
  return {kind:'embed',src:url.href,provider:'Vimeo',autoplayOnLoad};
 }
 if(/\.mp4$/i.test(u.pathname))return {kind:'file',src:u.href};
 return {kind:'invalid'};
}
