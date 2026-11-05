export function launchVideoSource(value){
 if(!value?.trim())return {kind:'placeholder'};
 let u;try{u=new URL(value)}catch{return {kind:'invalid'}}
 if(u.protocol!=='https:'||u.username||u.password)return {kind:'invalid'};
 const host=u.hostname.toLowerCase().replace(/^www\./,''),path=u.pathname.split('/').filter(Boolean);
 if(['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)){
  const id=host==='youtu.be'?path[0]:['embed','shorts','live'].includes(path[0])?path[1]:u.searchParams.get('v');
  return /^[\w-]{11}$/.test(id??'')?{kind:'embed',src:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,provider:'YouTube'}:{kind:'invalid'};
 }
 if(['vimeo.com','player.vimeo.com'].includes(host)){
  const id=path[0]==='video'?path[1]:path[0];if(!/^\d+$/.test(id??''))return {kind:'invalid'};
  const url=new URL('https://player.vimeo.com/video/'+id),hash=u.searchParams.get('h')??(path[0]!=='video'?path[1]:null);if(hash&&/^[a-f0-9]+$/i.test(hash))url.searchParams.set('h',hash);url.searchParams.set('autoplay','1');return {kind:'embed',src:url.href,provider:'Vimeo'};
 }
 if(/\.mp4$/i.test(u.pathname))return {kind:'file',src:u.href};
 return {kind:'invalid'};
}
