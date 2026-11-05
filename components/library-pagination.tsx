'use client';
export function LibraryPagination({page,totalPages,loading,onPageChange}:{page:number;totalPages:number;loading:boolean;onPageChange:(page:number)=>void}){
 // Show all numbers for small libraries, and a compact window for large ones.
 const numbers=totalPages<=15?Array.from({length:totalPages},(_,index)=>index+1):[...new Set([1,...Array.from({length:5},(_,index)=>page+index-2).filter(value=>value>1&&value<totalPages),totalPages])].sort((a,b)=>a-b);
 return <div className="studio-page-controls">
  <span className="studio-page-position" aria-live="polite">Page {page}{totalPages?' of '+totalPages:''}</span>
  <div className="studio-page-buttons">
   <button className="studio-button" disabled={loading||page<=1} onClick={()=>onPageChange(page-1)}>← Previous</button>
   <div className="studio-page-numbers" role="group" aria-label="Page numbers">{numbers.map((number,index)=><span className="studio-page-number" key={number}>{index>0&&number>numbers[index-1]+1&&<span className="studio-page-gap" aria-hidden="true">…</span>}<button className="studio-button" aria-label={'Page '+number} aria-current={page===number?'page':undefined} disabled={loading} onClick={()=>onPageChange(number)}>{number}</button></span>)}</div>
   <button className="studio-button" disabled={loading||!totalPages||page>=totalPages} onClick={()=>onPageChange(page+1)}>Next →</button>
  </div>
  {totalPages>15&&<form className="studio-page-jump" onSubmit={event=>{event.preventDefault();const value=Number(new FormData(event.currentTarget).get('page'));if(!loading&&Number.isSafeInteger(value)&&value>=1&&value<=totalPages)onPageChange(value)}}><label htmlFor="studio-jump-page">Jump to page</label><input id="studio-jump-page" name="page" type="number" inputMode="numeric" min={1} max={totalPages} required disabled={loading} placeholder={String(page)}/><button className="studio-button" disabled={loading}>Go</button></form>}
 </div>;
}
