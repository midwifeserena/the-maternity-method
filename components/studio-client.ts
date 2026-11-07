export async function studioRequest(path:string,options:RequestInit={}){
 const response=await fetch('/api/study-studio/'+path,{cache:'no-store',...options});const data=await response.json().catch(()=>({error:'Could not read this response.'}));if(!response.ok)throw Error(data.error||'Your Study Studio is temporarily unavailable.');return data;
}
export const studioSave=(path:string,item:unknown)=>studioRequest(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
export async function studioUpload(file:File){const form=new FormData();form.append('file',file);return (await studioRequest('assets',{method:'POST',body:form})).item;}
