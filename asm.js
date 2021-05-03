function ARG_R     () {return [this.r];};
function ARG_C     () {return [this.c];};
function ARG_C_V16 () {return [this.c, '$' + hex_format(this.v, 4)];};
function ARG_V8    () {return ['$' + hex_format(this.v, 2)];};
function ARG_V16   () {return ['$' + hex_format(this.v, 4)];};
function ARG_R1_R2 () {return [this.r1, this.r2];};
function ARG_R_V8  () {return [this.r, '$' + hex_format(this.v, 2)];};
function ARG_R_V16 () {return [this.r, '$' + hex_format(this.v, 4)];};
function ARG_V_R   () {return [this.v, this.r];};
function ARG_R_A   () {return [this.r, '[$' + hex_format(this.a, 4) + ']'];};
function ARG_A_R   () {return ['[$' + hex_format(this.a, 4) + ']', this.r];};
function ARG_R_C   () {return [this.r, '[$FF00 + c]'];};
function ARG_C_R   () {return ['[$FF00 + c]', this.r];};
function ARG_00H   () {return [hex_format(this.v, 2) + 'H'];};
function ARG_R_SPV8() {return [this.r, 'sp + ' + hex_format(this.v)];}

const REGX = ['b', 'c', 'd', 'e', 'h', 'l', '[hl]', 'a'];
const REGY = ['[bc]', '[de]', '[hl++]', '[hl--]'];
const REGZ = ['bc', 'de', 'hl', 'sp'];
const REGP = ['bc', 'de', 'hl', 'af'];
const COND = ['nz', 'z', 'nc', 'c'];
const TRAN = ['rla', 'rra', 'rla', 'rra', 'daa', 'cpl', 'scf', 'ccf'];
const ALU  = ['add', 'adc', 'sub', 'sbc', 'and', 'xor', 'or', 'cp'];
const CB1  = ['rlc', 'rrc', 'rl', 'rr', 'sla', 'sra', 'swap', 'srl'];
const CB2  = ['bit', 'res', 'set'];

function ASMParse(data, it, offset) {
  let cmd = data[it];
  let a = cmd >> 6;
  let b = (cmd >> 3) & 0b111;
  let c = cmd & 0b111;
  
  switch(a) {
  case 0:
    switch(c) {
    case 0b000:
      switch(b) {
      case 0b00: return {ptr: it, len: 1, cmd: cmd, name: 'nop'};
      case 0b01: return {ptr: it, len: 3, cmd: cmd, args: ARG_R_V16, name: 'ld', r: 'sp', v: data[++it] | (data[++it] << 8)};
      case 0b10: return {ptr: it, len: 2, cmd: cmd, args: ARG_V8   , name: 'stop', v: data[++it]};
      case 0b11: return {ptr: it, len: 2, cmd: cmd, args: ARG_V16  , name: 'jr'  , v: data[++it] + offset + it + 1};
      default:   return {ptr: it, len: 2, cmd: cmd, args: ARG_R_V16, name: 'jr'  , r: COND[b & 3], v: data[++it] + offset + it + 1};
      }
    case 0b001:
      if(b & 1) return {ptr: it, len: 1, cmd: cmd, args: ARG_R1_R2, name: 'add', r1: 'hl', r2:  REGZ[b >> 1]};
      else      return {ptr: it, len: 3, cmd: cmd, args: ARG_R_V16, name: 'ld' , r: REGZ[b >> 1], v: data[++it] | (data[++it] << 8)};
    case 0b010:
      if(b & 1) return {ptr: it, len: 1, cmd: cmd, args: ARG_R1_R2, name: 'ld', r1: 'a'         , r2:  REGY[b >> 1]};
      else      return {ptr: it, len: 1, cmd: cmd, args: ARG_R1_R2, name: 'ld', r1: REGY[b >> 1], r2: 'a'          };
    case 0b011: return {ptr: it, len: 1, cmd: cmd, args: ARG_R    , name: b & 1 ? 'dec' : 'inc', r: REGZ[b >> 1]};
    case 0b100: return {ptr: it, len: 1, cmd: cmd, args: ARG_R    , name: 'inc', r:  REGX[b]};
    case 0b101: return {ptr: it, len: 1, cmd: cmd, args: ARG_R    , name: 'dec', r:  REGX[b]};
    case 0b110: return {ptr: it, len: 2, cmd: cmd, args: ARG_R_V8 , name: 'ld' , r:  REGX[b], v: data[++it]};
    case 0b111: return {ptr: it, len: 1, cmd: cmd, name: TRAN[b]};
    }
    break;
  case 1:
    if(cmd == 0x76) return {ptr: it, len: 1, cmd: cmd, name: 'halt'};
    return {ptr: it, len: 1, cmd: cmd, args: ARG_R1_R2, name: 'ld', r1: REGX[b], r2: REGX[c]};
  case 2:
    return {ptr: it, len: 1, cmd: cmd, args: ARG_R, name: ALU[b], r: REGX[c]};
  case 3:
    switch(c) {
    case 0b000:
      if(b & 4) if(b & 1) break;
      else      return {ptr: it, len: 2, cmd: cmd, args: (b & 2) ? ARG_A_R : ARG_R_A, name: 'ldh', r: 'a', a: 0xFF00 + data[++it]};
      else      return {ptr: it, len: 1, cmd: cmd, args: ARG_C, name: 'ret', c: COND[b & 3]};
    case 0b001:
      if(b & 1) break;
      else      return {ptr: it, len: 1, cmd: cmd, args: ARG_R, name: 'pop' , r: REGP[b >> 1]};
    case 0b010:
      if(b & 4)
       if(b & 1)return {ptr: it, len: 3, cmd: cmd, args: (b & 2) ? ARG_R_A : ARG_A_R, name: 'ld', r: 'a', a: data[++it] | (data[++it] << 8)};
       else     return {ptr: it, len: 1, cmd: cmd, args: (b & 2) ? ARG_R_C : ARG_C_R, name: 'ld', r: 'a'};
      else      return {ptr: it, len: 3, cmd: cmd, args: ARG_R_V16, name: 'jp', r: COND[b & 3], v: data[++it] | (data[++it] << 8)};
    case 0b100:
      if(b & 4) break;  // invalid
      else      return {ptr: it, len: 3, cmd: cmd, args: ARG_C_V16, name: 'call', c: COND[b & 3], v: data[++it] | (data[++it] << 8)};
    case 0b101:
      if(b & 1) break;
      else      return {ptr: it, len: 1, cmd: cmd, args: ARG_R  , name: 'push', r: REGP[b >> 1]};
    case 0b110: return {ptr: it, len: 2, cmd: cmd, args: ARG_V8 , name: ALU[b], v: data[++it]};
    case 0b111: return {ptr: it, len: 1, cmd: cmd, args: ARG_00H, name: 'rst' , v: b << 3}
    }
    
    switch(cmd) {  
    case 0xC3: return {ptr: it, len: 3, cmd: cmd, args: ARG_V16, name: 'jp' , v: data[++it] | (data[++it] << 8)};
    case 0xF3: return {ptr: it, len: 1, cmd: cmd, name: 'di'};
    
    case 0xE8: return {ptr: it, len: 2, cmd: cmd, args: ARG_R_V8  , name: 'add', r: 'sp', v: data[++it]};
    case 0xF8: return {ptr: it, len: 2, cmd: cmd, args: ARG_R_SPV8, name: 'ld' , r: 'hl', v: data[++it]};
    
    case 0xC9: return {ptr: it, len: 1, cmd: cmd, name: 'ret'};
    case 0xD9: return {ptr: it, len: 1, cmd: cmd, name: 'reti'};
    case 0xE9: return {ptr: it, len: 1, cmd: cmd, args: ARG_R, name: 'jp', r: 'hl'};
    case 0xF9: return {ptr: it, len: 1, cmd: cmd, args: ARG_R1_R2 , name: 'ld' , r: 'sp', r: 'hl'};
    
    case 0xCB:
      let cmd2 = data[it + 1];
      if(cmd2 < 0x40) return {ptr: it, len: 2, cmd: cmd, cmd2: cmd2, args: ARG_R  , name: CB1[cmd2 >> 3], r: REGX[cmd2 & 0x07]};
      else            return {ptr: it, len: 2, cmd: cmd, cmd2: cmd2, args: ARG_V_R, name: CB2[(cmd2 >> 6) - 1], r: REGX[cmd2 & 0x07], v: (cmd2 >> 3) & 0x7};
    case 0xFB: return {ptr: it, len: 1, cmd: cmd, name: 'ei'};
    
    case 0xCD: return {ptr: it, len: 3, cmd: cmd, args: ARG_V16, name: 'call', v: data[++it] | (data[++it] << 8)};
    default: return {ptr: it, len: 1, cmd: cmd, name: '??'};
    }
  }
}