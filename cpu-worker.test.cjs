'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../assessment-worker.mjs');
function fixture(inputTokens=100){
 const trace={};const generator=async (messages,options)=>{trace.messages=messages;trace.options=options;return [{generated_text:'{"recommendation":"indeterminate"}'}]};
 generator.tokenizer={apply_chat_template(messages,options){trace.tokenization={messages,options};return {input_ids:{dims:[1,inputTokens]}}}};
 const env={backends:{onnx:{wasm:{}}}};
 return {trace,env,runtime:{env,pipeline:async(task,model,options)=>{trace.pipeline={task,model,options};return generator},TextStreamer:class{constructor(tokenizer,options){trace.streamer=options}}}};
}
test('CPU configuration uses single-thread WASM q4 without isolation or GPU',async()=>{
 const m=await load(),f=fixture();m.configureCPU(f.env);assert.equal(f.env.backends.onnx.wasm.numThreads,1);assert.equal(f.env.backends.onnx.wasm.proxy,false);assert.equal(f.env.allowLocalModels,false);assert.equal(m.cpuOptions(()=>{}).device,'wasm');assert.equal(m.cpuOptions(()=>{}).dtype,'q4');
});
test('CPU runner passes case only to local generator, includes schema, publishes complete JSON',async()=>{
 const m=await load(),f=fixture(),events=[];const run=m.createRunner(async()=>f.runtime);
 const messages=[{role:'system',content:'Instructions'},{role:'user',content:'Synthetic private case'}];
 await run({model:m.MODEL_ID,messages,schema:{type:'object'}},msg=>events.push(msg));
 assert.equal(f.trace.pipeline.model,m.MODEL_ID);assert.equal(f.trace.pipeline.options.device,'wasm');assert.equal(f.trace.options.do_sample,false);assert.equal(f.trace.options.return_full_text,false);assert.match(f.trace.messages[0].content,/"type":"object"/);assert.equal(f.trace.messages[1].content,'Synthetic private case');assert.equal(messages[0].content,'Instructions');assert.equal(events.at(-1).type,'result');assert.equal(events.some(e=>(e.message||'').includes('Synthetic private case')),false);
});
test('CPU context overflow fails explicitly before inference; model mismatch fails before download',async()=>{
 const m=await load(),f=fixture(8000),run=m.createRunner(async()=>f.runtime);
 await assert.rejects(run({model:m.MODEL_ID,messages:[{role:'system',content:'Test'}],schema:{}},()=>{}),/exceed the CPU model context/);assert.equal(f.trace.options,undefined);
 await assert.rejects(run({model:'old-GPU-model',messages:[],schema:{}},()=>{}),/Unsupported CPU model/);
});
test('CPU JSON decoding accepts only whole structured replies, not partial salvage',async()=>{
 const {parseJSONReply}=await load();assert.equal(parseJSONReply('```json\n{"a":1}\n```'),'{"a":1}');
 for(const s of ['','{"a":','Explanation {"a":1}','{"a":1} trailing'])assert.throws(()=>parseJSONReply(s));
});
test('CPU pipeline failures propagate; no substitute model output is generated',async()=>{
 const m=await load(),events=[];const run=m.createRunner(async()=>{throw new Error('Synthetic download failure')});
 await assert.rejects(run({model:m.MODEL_ID,messages:[{role:'system',content:'Test'}],schema:{}},e=>events.push(e)),/download failure/);assert.ok(!events.some(e=>e.type==='result'));
});
