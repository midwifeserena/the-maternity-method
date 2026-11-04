export function formatExamTime(seconds){
 const value=Math.max(0,Math.floor(seconds));
 return [Math.floor(value/3600),Math.floor(value%3600/60),value%60].map(part=>String(part).padStart(2,'0')).join(':');
}

export function isQuestionAnswered(question,answer){
 const ids=new Set(question.options.map(option=>option.id));
 if(question.type==='single')return typeof answer==='string'&&ids.has(answer);
 if(question.type==='sata')return Array.isArray(answer)&&answer.length>0&&answer.every(id=>ids.has(id));
 if(question.type==='matrix'&&question.matrix_mode==='multiple')return Boolean(question.matrix_rows?.length)&&answer!==null&&typeof answer==='object'&&!Array.isArray(answer)&&question.matrix_rows.every(row=>Array.isArray(answer[row.id])&&answer[row.id].length>0&&answer[row.id].every(id=>ids.has(id)));
 if(question.type==='matrix')return Boolean(question.matrix_rows?.length)&&answer!==null&&typeof answer==='object'&&!Array.isArray(answer)&&question.matrix_rows.every(row=>ids.has(answer[row.id]));
 return false;
}

/** Small arithmetic parser: no eval, JavaScript execution, or external requests. */
export function calculateExpression(expression){
 const source=expression.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replace(/\s/g,'');
 if(!source||source.length>120||!/^[\d.+\-*/()%]+$/.test(source))throw Error('Enter a valid calculation.');
 let position=0;
 function factor(){
  let value;
  if(source[position]==='+'){position++;value=factor()}
  else if(source[position]==='-'){position++;value=-factor()}
  else if(source[position]==='('){position++;value=sum();if(source[position++]!==')')throw Error('Close the parentheses.');}
  else{
   const token=source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)?.[0];
   if(!token)throw Error('Enter a valid calculation.');
   position+=token.length;value=Number(token);
  }
  while(source[position]==='%'){value/=100;position++;}
  return value;
 }
 function product(){let value=factor();while(source[position]==='*'||source[position]==='/'){const operator=source[position++],next=factor();if(operator==='/'&&next===0)throw Error('Cannot divide by zero.');value=operator==='*'?value*next:value/next;}return value;}
 function sum(){let value=product();while(source[position]==='+'||source[position]==='-'){const operator=source[position++],next=product();value=operator==='+'?value+next:value-next;}return value;}
 const value=sum();
 if(position!==source.length||!Number.isFinite(value))throw Error('Enter a valid calculation.');
 return String(Number(value.toPrecision(12)));
}
