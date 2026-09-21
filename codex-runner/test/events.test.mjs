import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCodexEvent } from '../events.mjs';

test('uses official SDK thread_id field', () => {
  assert.deepEqual(projectCodexEvent({type:'thread.started',thread_id:'thread-abc'}),{threadId:'thread-abc'});
});
test('tracks successful completion and failures separately', () => {
  assert.deepEqual(projectCodexEvent({type:'turn.completed',usage:{input_tokens:20}}),{completed:true});
  assert.deepEqual(projectCodexEvent({type:'turn.failed',error:{message:'Model unavailable'}}),{error:'Model unavailable'});
  assert.deepEqual(projectCodexEvent({type:'error',message:'Disconnected'}),{error:'Disconnected'});
});
test('does not forward sensitive command, output or file-change body', () => {
  const marker='DONT_SHOW_ME';
  for(const item of [
    {type:'command_execution',command:'echo '+marker,aggregated_output:marker,status:'completed'},
    {type:'file_change',changes:[{diff:marker}],status:'completed'},
    {type:'mcp_tool_call',arguments:{token:marker},result:marker,status:'completed'}
  ]) {
    const projected=projectCodexEvent({type:'item.completed',item});
    assert.equal(JSON.stringify(projected).includes(marker),false);
    assert.equal(projected.activity.itemType,item.type);
  }
});
test('emits a completed assistant response, never intermediary reasoning', () => {
  assert.equal(projectCodexEvent({type:'item.updated',item:{type:'agent_message',text:'draft'}}).response,undefined);
  assert.equal(projectCodexEvent({type:'item.completed',item:{type:'agent_message',text:'final'}}).response,'final');
  assert.deepEqual(projectCodexEvent({type:'item.completed',item:{type:'reasoning',text:'private'}}),{});
});
