// A really long script that does everything.
// Includes a literal mix of data decoding/parsing, resource management, class definitions, UI...

function height_auto(e) {
  e.target.style.height = 'auto';
  e.target.removeEventListener('transitionend', height_auto);
}

function toggle_open(e) {
  if(window.event.target.classList.contains('resize_handler')) return;
  let c = e.nextElementSibling;
  c.style.height = c.offsetHeight + 'px';
  
  let isopen = e.classList.contains('open');
  let height = !isopen * c.scrollHeight;
  e.classList[isopen ? 'remove' : 'add']('open');
  
  c.style.transition = 'height 0.5s';
  requestAnimationFrame(function() {
    c.style.height = height + 'px';
    if(height > 0) c.addEventListener("transitionend", height_auto);
    else c.removeEventListener('transitionend', height_auto);
  });
}

function toggle_flag(e, d, n = []) {
  let disabled = !e.checked;
  render_flags = disabled ? render_flags & ~d : render_flags | d;
  for(let i = 0; i < n.length; ++i) document.getElementById(n[i]).disabled = disabled;
  render_screen();
}

function GET(file, res_type, callback, args = []) {
  return new Promise(function (resolve, reject) {
    let r = new XMLHttpRequest();
    r.open("GET", file);
    r.responseType = res_type;
    r.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        if (callback) callback(...args, this.response);
        resolve(r.response);
      }
      else reject({status: this.status, statusText: r.statusText});
    }
    r.onerror = function() {
      reject({status: this.status, statusText: r.statusText});
    }
    r.send(null);
  });
}

function b64tobytes(data) {
  data = atob(data);
  let l = data.length;
  let a = new Uint8Array(new ArrayBuffer(l));
  for(let i = -1; i < l; a[i] = data.charCodeAt(i++));
  return a;
}

function hex_format(i, s) {
   return i.toString(16).padStart(s, "0").toUpperCase();
}

function print_hex_array(data) {
   let str = '';
   for(let i = 0; i < data.length;) {
     str += hex_format(data[i], 2);
     if(++i % 0x10 == 0) str += '\n';
     else if(i % 0x08 == 0) str += ' | ';
     else str += ' ';
   }
   console.log(str);
}

class ZZAZZConnection {
  constructor(direction, map_id, x, y) {
     this.direction = direction;
     this.map_id = map_id;
     this.x = x;
     this.y = y;
  }
}

class ZZAZZWarp {
  constructor(address, y1, x1, x2, y2, map_id) {
     this.address = address;
     this.x1 = x1;
     this.y1 = y1;
     this.x2 = x2;
     this.y2 = y2;
     this.map_id = map_id;
  }
  
  get x() { return this.x1; }
  get y() { return this.y1; }
  
  show_properties(map, parent) {
    parent.parentNode.parentNode.classList.remove('hidden');
    parent.innerHTML = '';
    
    parent.appendChild(hover_highlight(create_row('Position', {'X': this.x1, 'Y': this.y1}, 'number'), this.address + MAP_PTR, 2));
    parent.appendChild(hover_highlight(create_row('To', {'Map': this.map_id ? MAP_NAMES[this.map_id] || ('bepis (0x' + hex_format(this.map_id, 4) + ')') : 'None'}, 'text'), this.address + MAP_PTR + 7, 1));
    parent.appendChild(hover_highlight(create_row('', {'X': this.x2, 'Y': this.y2}, 'number'), this.address + MAP_PTR + 5, 2));
  }
}

class ZZAZZSign {
  constructor(address, y, x, text) {
     this.address = address;
     this.x = x;
     this.y = y;
     this.text = text;
  }
  
  show_properties(map, parent) {
    parent.parentNode.parentNode.classList.remove('hidden');
    parent.innerHTML = '';
    
    parent.appendChild(hover_highlight(create_row('Position', {'X': this.x, 'Y': this.y}, 'number'), this.address + MAP_PTR, 2));
    parent.appendChild(document.createElement('br'));
    parent.appendChild(hover_highlight(create_row('Text ID', this.text, 'number'), this.address + MAP_PTR + 2, 1));
    parent.appendChild(document.createElement('br'));
    
    map.texts[map.txt_entries[this.text].ptr].show_properties(map, parent);
  }
}

class ZZAZZObject {
  constructor(address, sprite, y, x, movement, direction, text) {
     this.address = address;
     this.sprite = sprite;
     this.x = x - 4;
     this.y = y - 4;
     this.movement = movement;
     this.direction = direction;
     this.text = text;
  }
  
  show_properties(map, parent) {
    parent.parentNode.parentNode.classList.remove('hidden');
    parent.innerHTML = '';
    
    parent.appendChild(hover_highlight(create_row('Sprite', this.sprite, 'select', SPRITE_NAMES), this.address + MAP_PTR, 1));
    let row = create_row(null, null, 'none');
    let spr = get_spritesheet(map.palette, this.sprite) || [DEFAULT_TILE];
    for(let i = 0; i < spr.length; ++i) {
      let cpy = document.createElement('canvas').getContext('2d');
      cpy.canvas.width = cpy.canvas.height = TILE_SIZE;
      cpy.drawImage(spr[i].canvas, 0, 0);
      cpy.canvas.style.width = BLOCK_SIZE + 'px';
      row.lastChild.appendChild(cpy.canvas);
    }
    parent.appendChild(row);
    parent.appendChild(hover_highlight(create_row('Position', {'X': this.x, 'Y': this.y}, 'number'), this.address + MAP_PTR + 1, 2));
    parent.appendChild(hover_highlight(create_row('Movement', this.movement & 0x1, 'radio', ['Walk', 'Stay'], 'movement'), this.address + MAP_PTR + 3, 1));
    parent.appendChild(hover_highlight(create_row('Direction', this.direction, 'select', WALK_DIRECTION), this.address + MAP_PTR + 4, 1));
    parent.appendChild(document.createElement('br'));
    parent.appendChild(hover_highlight(create_row('Text ID', this.text, 'number'), this.address + MAP_PTR + 5, 1));
    parent.appendChild(document.createElement('br'));
    
    map.texts[map.txt_entries[this.text].ptr].show_properties(map, parent);
  }
}

class ZZAZZScript {
  constructor(map, ptr) {
    this.ptr = ptr;
    this.script = [];
    this.texts = [];

    let it, hl;
    let branches = [[ptr, ptr + MAP_PTR]];
    let regions = [];
    
    // Very hacky solution! Should follow the execution accurately... I don't feel like doing that right now.
  outer:
    while(branches.length > 0) {
      [it, hl] = branches.shift();
      let asm_data = [];
      let start_it = it;
      let printed = false;
    loop:
      while(it < map.data.length) {
        let overlap = false;
        for(let i = 0; i < regions.length; ++i) {
          let region = regions[i];
          if(region[0] <= it && it < region[1]) {
            //console.log('Overlapping branch/loop at: map: ' + hex_format(map.id, 4) + ' ' + map.name + '; it: ' + hex_format(it, 4) + '; hl: ' + hex_format(hl, 4));
            if(region[2] && !this.texts.includes(hl)) {
              if(map.data[it] == 0x21) continue outer; // Clear most common 
              this.texts.push(hl);
              //console.log('Maybe a different text. hl: ' + hex_format(hl, 4));
            }
            continue outer;
          }
        }
        
        let asm = ASMParse(map.data, it, MAP_PTR);
        if(asm.name == '??') console.log(hex_format(asm.cmd, 2) + " at " + hex_format(map.id, 4), this); // Probably something went wrong.
        asm_data.push(asm);
        it += asm.len;
        
        switch(asm.cmd) { // Let's see if this can find the texts!
        case 0x20: case 0x28:
        case 0x30: case 0x38:
        case 0xC2: case 0xCA:
        case 0xD2: case 0xDA:
          var j = asm.v - MAP_PTR;
          if(j > 0 && j < map.data.length) branches.push([j, hl]);
          break;
        case 0x21: // 'ld hl, $xxxx' is obviously the only instruction that modifies hl.
          hl = asm.v;
          break;
        case 0xCD:
          switch(asm.v) {
          case _PrintTextEnhanced:
          case _CheckEventAndPrintHLIfCompleted:
          case _CheckItemAndPrintHLIfCompleted:
            var j = hl - MAP_PTR;
            if(j <= 0 || j >= map.data.length) break;
            printed = true;
            if(this.texts.includes(hl)) break;
            this.texts.push(hl);
          }
          break;
        case 0xC3:
          if(asm.v == _EnhancedTextOnly) {
            this.texts.push(hl + 3);
            printed = true;
            break loop;
          }
          var j = asm.v - MAP_PTR;
          if(j > 0 && j < map.data.length) branches.push([j, hl]);
        case 0xC9:
          break loop;
        }
      }
      this.script.push({asm: asm_data, ptr: start_it, length: it - start_it});
      regions.push([start_it, it, printed]);
    }
    
    this.texts.sort();
  }
  
  show_properties(map, parent) {
    let row = document.createElement('b');
    row.innerHTML = 'Script';
    parent.appendChild(row);
    parent.appendChild(create_row(null, this.script, 'code'));
  }
}

class ZZAZZText {
  constructor(map, ptr, raw = false) {
    this.ptr = ptr;
    this.events = [];
    this.flags = 0;
    this.length = 1;

    if(raw) return this.parse_text(map, ptr);
    
    let it = ptr;
    if(map.data[it] != 0x08) // TX_ASM
      return console.log("String at " + ptr + " from " + map.name + " (" + hex_format(map.id, 4) + ") is probably invalid!");
    
    // Basic textbox
    if(map.data[++it] == 0xC3 && map.data[it + 1] == 0x4E && map.data[it + 2] == 0xDC) //jp EnhancedTextOnly
      return this.parse_text(map, it + 2);
    
    this.script = new ZZAZZScript(map, it);
    for(let i = 0; i < this.script.texts.length; ++i) {
      let j = this.script.texts[i] - MAP_PTR;
      this.events.push({type: EVENT.TAG, ptr: j});
      this.parse_text(map, j - 1);
    }
  }
  
  parse_text(map, it) {
    let str = '';
    let c;
    let buf = false;
    while((c = map.data[++it]) != 0) {
      if(it >= map.data.length) {
        console.log(map.name + " (" + hex_format(map.id, 4) + ") is unterminated");
        this.flags |= 0x1;
        break;
      }
      if(c > 0xF0 && str != '') { this.events.push({type: EVENT.TEXT, text: str, ptr: it - str.length, length: str.length}); str = ''; }
      switch(c) {
      case 0xF1: // para
        this.events.push({type: EVENT.PARA, ptr: it, length: 1}); break;
      case 0xF2: // next
        this.events.push({type: EVENT.NEXT, ptr: it, length: 1}); break;
      case 0xF3: // cont
        this.events.push({type: EVENT.CONT, ptr: it, length: 1}); break;
      case 0xF4: // wait
        this.events.push({type: EVENT.WAIT, ptr: it, length: 1}); break;
      case 0xF5: // buf
        this.events.push({type: EVENT.BUF, address: map.data[++it] | (map.data[++it] << 8), ptr: it - 2, length: 3}); break;
      case 0xF6: // buf_end (not gonna happen)
        // I'm not reading the string buffers, only displaying the address
        break;
      case 0xF7: // font
        c = map.data[++it];
        switch(c) {
        default:
          this.flags |= 0x2;
          console.log('Unknown font (' + hex_format(c, 2) + ') found at ' + map.name + ' (' + hex_format(map.id, 4) + ')');
        case 0x8D:
        case 0x4D:
          this.events.push({type: EVENT.FONT, font: c, ptr: it - 1, length: 2});
        }
        break;
      case 0xF8: // sound
        this.events.push({type: EVENT.SND, sound: map.data[++it], ptr: it - 1, length: 2}); break;
      default:
        if (!(c in CHARSET_ASCII)) {
          //console.log('Invalid character ' + hex_format(c, 2) + ' found in ' + map.name + ' (' + hex_format(map.id, 4) + ')');
          this.flags |= 0x2;
          return;
        }
        str += CHARSET_ASCII[c];
      }
    }
    if(str != '') this.events.push({type: EVENT.TEXT, text: str, ptr: it - str.length, length: str.length});
    this.length = this.ptr - it;
  }
  
  show_properties(map, parent) {
    let font = null;
    let last_row = null;
    
    if(this.script) this.script.show_properties(map, parent);
    
    for(let i = 0; i < this.events.length; ++i) {
      let e = this.events[i];
      let row;
      let input;
      switch(e.type) {
      case EVENT.TAG:
        parent.appendChild(document.createElement('br'));
        row = document.createElement('b');
        row.innerHTML = '$' + hex_format(e.ptr + MAP_PTR, 4) + ':';
        parent.appendChild(row);
        continue;
      case EVENT.TEXT: 
        if(last_row) {
          row = last_row;
          last_row = null;
          break;
        }
      default:
        input = create_select(e.type, EVENT);
        input.classList.add('flex11');
        input.disabled = true;
        row = create_row(null, null, 'none');
        row.firstChild.appendChild(input);
      }
      
      let value;
      
      switch(e.type) {
      case EVENT.TEXT:
        input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.classList.add('pkm_textbox');
        input.classList.add('flex11');
        input.readOnly = true;
        if(font) {
          input.classList.add(font);
          input.title = e.text;
        }
        input.value = e.text;
        row.lastChild.appendChild(input);
        hover_highlight(input.parentElement, e.ptr + MAP_PTR, e.length);
        break;
      case EVENT.CONT:
        parent.appendChild(document.createElement('br'));
      case EVENT.NEXT:
      case EVENT.PARA:
        hover_highlight(input.parentElement, e.ptr + MAP_PTR, e.length);
        last_row = row;
        continue;
      case EVENT.FONT:
        hover_highlight(input.parentElement, e.ptr + MAP_PTR, 1);
        font = FONT[e.font] || null;
        input = create_select(e.font, FONT);
        input.classList.add('flex11');
        input.disabled = true;
        row.lastChild.appendChild(input);
        hover_highlight(input.parentElement, e.ptr + MAP_PTR + 1, 1);
        break;
      case EVENT.WAIT:
        hover_highlight(row, e.ptr + MAP_PTR, 1);
        break;
      case EVENT.BUF:
        value = value || hex_format(e.address, 4);
      case EVENT.SND:
        value = '0x' + (value || hex_format(e.sound, 2));
        
        hover_highlight(input.parentElement, e.ptr + MAP_PTR, 1);
        input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.classList.add('flex11');
        input.readOnly = true;
        input.value = value;
        row.lastChild.appendChild(input);
        hover_highlight(input.parentElement, e.ptr + MAP_PTR + 1, e.length - 1);
        break;
      }
      
      parent.appendChild(row);
    }
  }
}

class ZZAZZMap {
  constructor(id, b64data) {
    this.id = id;
    this.name = MAP_NAMES[id] || 'bepis';
    [this.x, this.y] = GLOBAL_POS[this.id] || [0, 0];
    
    this.data = b64tobytes(b64data);
    this.tileset = this.data[5];
    this.height  = this.data[6];
    this.width   = this.data[7];
    
    this.blk_ptr = (this.data[8 ] | (this.data[9 ] << 8)) - MAP_PTR;
    this.txt_ptr = (this.data[10] | (this.data[11] << 8)) - MAP_PTR;
    this.scr_ptr = (this.data[12] | (this.data[13] << 8)) - MAP_PTR;
  //this.connection_byte = data[14]; // unused?
    this.obj_ptr = (this.data[15] | (this.data[16] << 8)) - MAP_PTR;
    this.ini_ptr = (this.data[17] | (this.data[18] << 8)) - MAP_PTR;
    this.ram_ptr = (this.data[19] | (this.data[20] << 8)) - MAP_PTR;
    
    this.palette  = this.data[21] + 1;
    this.mus_id   = this.data[22];
    this.mus_bank = this.data[23];
    this.connections = [
       new ZZAZZConnection(this.data[24], (this.data[25] << 8) | this.data[26], this.data[27], this.data[28]),
       new ZZAZZConnection(this.data[29], (this.data[30] << 8) | this.data[31], this.data[32], this.data[33]),
       new ZZAZZConnection(this.data[34], (this.data[35] << 8) | this.data[36], this.data[37], this.data[38]),
       new ZZAZZConnection(this.data[39], (this.data[40] << 8) | this.data[41], this.data[42], this.data[43])
    ];
    
    let it = this.obj_ptr;
    this.border = this.data[it];
    this.warps = [];
    for (let i = this.data[++it] >> 1; i > 0; --i)
      this.warps.push(new ZZAZZWarp(++it, this.data[it], this.data[++it], this.data[it += 4], this.data[++it], (id & 0xFF00) | this.data[++it]));
    this.signs = [];
    for (let i = this.data[++it]; i > 0; --i)
      this.signs.push(new ZZAZZSign(++it, this.data[it], this.data[++it], this.data[++it]));
    this.objects = [];
    for (let i = this.data[++it]; i > 0; --i)
      this.objects.push(new ZZAZZObject(++it, this.data[it], this.data[++it], this.data[++it], this.data[++it], this.data[++it], this.data[++it]));
    
    this.txt_entries = {};
    this.texts = {};
    this.parse_texts(this.signs);
    this.parse_texts(this.objects);
    
    // MAP_SCRIPT
    if(this.data[this.scr_ptr] == 0xC9) return;
    this.script = new ZZAZZScript(this, this.scr_ptr);
    
    // MAP_SCRIPT_TEXTS
    if(this.script.texts.length <= 0) return;
    this.script_texts = [];
    for(let i = 0; i < this.script.texts.length; ++i)
      this.script_texts.push(new ZZAZZText(this, this.script.texts[i] - MAP_PTR - 1, true));
  }
  
  parse_texts(list) {
    for (let i = 0; i < list.length; ++i) {
      let e = list[i];
      if(e.text in this.txt_entries) {
        this.txt_entries[e.text].push(e);
        continue;
      }
      let entry = this.txt_entries[e.text] = [e];
      entry.ptr = this.txt_ptr + e.text + e.text - 2;
      
      if(entry.ptr + 1 >= this.data.length) { 
        entry.ptr = null;
        continue;
      }
      entry.ptr = ((this.data[entry.ptr + 1] << 8) | this.data[entry.ptr]) - MAP_PTR;
      
      if(entry.ptr >= this.data.length || entry.ptr < 0 || entry.ptr in this.texts) continue;
      this.texts[entry.ptr] = new ZZAZZText(this, entry.ptr);
    }
  }
  
  async prerender() {
    let s = this.width * this.height;
    let fw = this.width + BX + BX;
    let fh = this.height + BY + BY;
    let fs = fw * fh;
    
    this.world_layer = document.createElement("canvas").getContext("2d");
    this.world_layer.canvas.classList.add('absolute');
    this.world_layer.canvas.classList.add('world_layer');
    this.world_layer.canvas.setAttribute('map_id', this.id);
    this.world_layer.canvas.width = fw * BLOCK_SIZE;
    this.world_layer.canvas.height = fh * BLOCK_SIZE;
    
    let block = get_block(this.palette, this.tileset, this.border);
    for(let i = 0; i < fs; ++i)
      this.world_layer.putImageData(block, (i % fw) * BLOCK_SIZE, ((i / fw) | 0) * BLOCK_SIZE);
      
    let entry_ptr = 0x6EE + this.width;
    for(let i = this.ram_ptr; this.data[i] != 0xFF && i < this.data.length;) {
      let opcode = this.data[i++];
      let arg1 = opcode & 0x1F;
      let arg2 = this.data[i++];
      opcode = (opcode & 0xE0) >>> 5;
      let ix = ((arg1 << 8) + arg2) - entry_ptr;
    
      switch(opcode) {
      case 0x7: // select
        block = get_block(this.palette, this.tileset, arg2); break;
      case 0x0: // copy_1
      case 0x1: // copy_2
      case 0x2: // copy_3
        for(let j = 0; j <= opcode; ++j, ++ix) {
          let ib = get_block(this.palette, this.tileset, this.data[i++]);
          this.world_layer.putImageData(ib, (ix % fw) * BLOCK_SIZE, ((ix / fw) | 0) * BLOCK_SIZE);
        }
        break;
      case 0x3: // copy_n
        for(let ib; (ib = this.data[i++]) != 0xFF; ++ix) {
          ib = get_block(this.palette, this.tileset, ib);
          this.world_layer.putImageData(ib, (ix % fw) * BLOCK_SIZE, ((ix / fw) | 0) * BLOCK_SIZE);
        }
        break;
      case 0x5: // fill_3
        this.world_layer.putImageData(block, (ix % fw) * BLOCK_SIZE, ((ix++ / fw) | 0) * BLOCK_SIZE);
      case 0x4: // fill_2
        this.world_layer.putImageData(block, (  ix % fw) * BLOCK_SIZE, ((ix / fw) | 0) * BLOCK_SIZE);
        this.world_layer.putImageData(block, (++ix % fw) * BLOCK_SIZE, ((ix / fw) | 0) * BLOCK_SIZE);
        break;
      case 0x6: // fill_n
        let n = this.data[i++];
        for(let j = 0; j <= n; ++j, ++ix)
          this.world_layer.putImageData(block, (ix % fw) * BLOCK_SIZE, ((ix / fw) | 0) * BLOCK_SIZE);
        break;
      default:
        console.log('invalid opcode ', opcode); break;
      }
    }
    
    for(let i = 0; i < s; ++i) {
      block = get_block(this.palette, this.tileset, this.data[this.blk_ptr + i]);
      this.world_layer.putImageData(block, (BX + i % this.width) * BLOCK_SIZE, (BY + ((i / this.width) | 0)) * BLOCK_SIZE);
    }
    
    this.object_layer = document.createElement("canvas").getContext("2d");
    this.object_layer.canvas.classList.add('absolute');
    this.object_layer.canvas.width = this.width * BLOCK_SIZE;
    this.object_layer.canvas.height = this.height * BLOCK_SIZE;
    
    for(let i = 0; i < this.objects.length; ++i) {
      let obj = this.objects[i];
      let spritesheet = get_spritesheet(this.palette, obj.sprite);
      let sprite = 0;
      if(spritesheet.length > 1 && obj.movement == 0xFF && (obj.direction & 0xF8) == 0xD0)
        sprite = (obj.direction & 0x3) * (1 + (spritesheet.length > 4));
      this.object_layer.drawImage(spritesheet[sprite].canvas, obj.x * TILE_SIZE, obj.y * TILE_SIZE);
    }
  }
  
  async render () {
    let mapx = (this.x - screen_x) * zmul;
    let mapy = (this.y - screen_y) * zmul;
    let mapw = this.world_layer.canvas.width  * zmul;
    let maph = this.world_layer.canvas.height * zmul;
    
    if(screen.canvas.width  < mapx || 0 > mapx + mapw ||
       screen.canvas.height < mapy || 0 > mapy + maph ) {
      if(this.world_layer.canvas.parentNode) main.removeChild(this.world_layer.canvas);
      if(this.object_layer.canvas.parentNode) main.removeChild(this.object_layer.canvas);
      return;
    }
    rendered_maps.push(this);
    
    let block_size = BLOCK_SIZE * zmul;
    let tile_size = TILE_SIZE * zmul;
    
    main.insertBefore(this.world_layer.canvas, screen.canvas);
    this.world_layer.canvas.style.left  = mapx + 'px';
    this.world_layer.canvas.style.top   = mapy + 'px';
    this.world_layer.canvas.style.width = mapw + 'px';
    
    mapx += BX * block_size;
    mapy += BY * block_size;
    
    if(render_flags & 0x01) {
      main.insertBefore(this.object_layer.canvas, screen.canvas);
      this.object_layer.canvas.style.left  = mapx + 'px';
      this.object_layer.canvas.style.top   = mapy + 'px';
      this.object_layer.canvas.style.width = this.width * block_size + 'px';
      
      if(render_flags & 0x10) {
        screen.strokeStyle = '#00FFFF';
        for(let i = 0; i < this.objects.length; ++i) {
           let obj = this.objects[i];
           screen.strokeRect(mapx + obj.x * tile_size, mapy + obj.y * tile_size, tile_size, tile_size);
        }
      }
    }
    
    screen.lineWidth = 1.5;
    
    if(render_flags & 0x02) {
      screen.strokeStyle = '#FF0000';
      screen.strokeRect(mapx, mapy, this.width * block_size, this.height * block_size);
    }
    
    if(render_flags & 0x04) {
      screen.strokeStyle = '#FFFF00';
      for(let i = 0; i < this.signs.length; ++i) {
         let sign = this.signs[i];
         screen.strokeRect(mapx + sign.x * tile_size, mapy + sign.y * tile_size, tile_size, tile_size);
      }
    }
    if(render_flags & 0x08) {
      screen.strokeStyle = '#00FF00';
      for(let i = 0; i < this.warps.length; ++i) {
         screen.strokeStyle = '#00FF00';
         let warp = this.warps[i];
         let x = mapx + warp.x1 * tile_size;
         let y = mapy + warp.y1 * tile_size;
         screen.strokeRect(x, y, tile_size, tile_size);
         
         if(!(render_flags & 0x20)) continue;
         let warp_map = loaded_maps[warp.map_id];
         if(!warp_map) continue;
       
         screen.strokeStyle = warp_map.id < this.id ? '#0088FF' : '#8800FF';
         screen.beginPath();
         x += tile_size >> 1;
         y += tile_size >> 1;
         screen.moveTo(x, y);
         let x2 = (warp_map.x - screen_x) * zmul + BX * block_size + warp.x2 * tile_size + (tile_size >> 1);
         let y2 = (warp_map.y - screen_y) * zmul + BY * block_size + warp.y2 * tile_size + (tile_size >> 1);
         screen.lineTo(x2, y2);
         screen.stroke();
      }
    }
  }
  
  show_properties(parent) {
    parent.parentNode.parentNode.classList.remove('hidden');
    parent.innerHTML = '';
    
    parent.appendChild(create_row('ID', '0x' + hex_format(this.id, 4), 'text'));
    parent.appendChild(create_row('Name', this.name, 'text'));
    parent.appendChild(hover_highlight(create_row('Bounds', {'X': this.width, 'Y': this.height}, 'number'), 0xB801, 2));
    parent.appendChild(hover_highlight(create_row('Tileset', this.tileset, 'select', TILESET_NAMES), 0xB800, 1));
    let palette = this.palette | ((this.tileset == 0x11) << 8);
    parent.appendChild(hover_highlight(create_row('Palette', palette, 'palette'), 0xB810, 1));
    parent.appendChild(hover_highlight(create_row('Music', {'ID': this.mus_id, 'Bank': this.mus_bank}, 'number'), 0xB811, 2));
    parent.appendChild(document.createElement('br'));
    
    let title = document.createElement('b');
    title.innerHTML = 'Connections';
    parent.appendChild(title);
    for(let i = 0; i < this.connections.length; ++i) {
      let con = this.connections[i];
      let addr = 0xB813 + i * 5;
      parent.appendChild(hover_highlight(create_row(DIRECTION[con.direction - 1], {'Map': con.map_id ? MAP_NAMES[con.map_id] || ('bepis (0x' + hex_format(con.map_id, 4) + ')') : 'None'}, 'text'), addr, 3));
      parent.appendChild(hover_highlight(create_row('', {'X': con.x, 'Y': con.y}, 'number'), addr + 3, 2));
    }
    
    if(!this.script) return;
    parent.appendChild(document.createElement('br'));
    this.script.show_properties(this, parent);
    if(!this.script_texts) return;
    for(let i = 0; i < this.script_texts.length; ++i) {
      let text = this.script_texts[i];
      parent.appendChild(document.createElement('br'));
      let title = document.createElement('b');
      title.innerHTML = '$' + hex_format(text.ptr + MAP_PTR, 4) + ':';
      parent.appendChild(title);
      text.show_properties(this, parent);
    }
  }
  
  show_data(parent) {
    parent.innerHTML = '';
    
    let first_row = MAP_PTR & 0xFFF0;
    let table = document.createElement('table');
    table.classList.add('table_data');
    
    let row = document.createElement('tr');
    table.appendChild(row);
    
    let header = document.createElement('th');
    header.innerHTML = hex_format(first_row, 4);
    row.appendChild(header);
    let padding = MAP_PTR - first_row;
    for(let i = 0; i < padding; ++i) {
      let filler = document.createElement('td');
      row.appendChild(filler);
      filler.classList.add('disabled');
      filler.innerHTML = hex_format(0, 2);
    }
    
    for(let i = 0; i < this.data.length; ++i) {
      let addr = MAP_PTR + i;
      if((addr & 0xF) == 0) {
         row = document.createElement('tr');
         table.appendChild(row);
         
         header = document.createElement('th');
         header.innerHTML = hex_format(addr, 4);
         row.appendChild(header);
      }
      let cell = document.createElement('td');
      cell.innerHTML = hex_format(this.data[i], 2);
      row.appendChild(cell);
    }
  
    for(let i = MAP_PTR + this.data.length; (i & 0xF) != 0; ++i) {
      let filler = document.createElement('td');
      row.appendChild(filler);
      filler.classList.add('disabled');
      filler.innerHTML = hex_format(0, 2);
    }
    
    parent.appendChild(table);
  }
}

function create_select(value, options) {
  let input = document.createElement('select');
  for(let i in options) {
     let option = document.createElement('option');
     option.innerHTML = options[i];
     option.value = i;
     input.appendChild(option);
   }
   input.value = value;
   return input;
}

function _hover_highlight_enter(e) {
  let addr = parseInt(e.target.getAttribute('address'));
  let len = parseInt(e.target.getAttribute('length'));
  let row = (addr - 1 - (MAP_PTR & 0xFFF0)) >> 4;
  let data = data_container.firstChild;
  for(let i = 0; i < len; ++i) {
    let j = ((addr + i) & 0xF) + 1;
    row += j == 1;
    data.children[row].children[j].classList.add('highlighted');
  }
}

function _hover_highlight_leave(e) {
  let els = document.getElementsByClassName('highlighted');
  for(let i = els.length; i > 0;)
    els[--i].classList.remove('highlighted');
}

function hover_highlight(element, address, length) {
  element.setAttribute('address', address);
  element.setAttribute('length', length);
  element.addEventListener('mouseenter', _hover_highlight_enter);
  element.addEventListener('mouseleave', _hover_highlight_leave);
  return element;
}

function create_row(name, value, type, ...args) {
  let row = document.createElement('tr');
  let label = document.createElement('td');
  label.innerHTML = name;
  row.appendChild(label);
  
  let content = document.createElement('td');
  content.classList.add('flex');
  if(!value || value.constructor != Object) {
    let input;
    switch(type) {
    case 'none': break;
    case 'palette':
      input = document.createElement('input');
      input.setAttribute('type', 'number');
      input.classList.add('flex110');
      input.readOnly = true;
      input.value = value & 0xFF;
      content.appendChild(input);
      
      let palette = value in PALETTES ? PALETTES[value] : value > 0xFF ? CAVE_PALETTE : PALETTES[0];
      for(let i = 0; i < palette.length; ++i) {
        let c = palette[i];
        let d = document.createElement('div');
        d.style.backgroundColor = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        d.classList.add('color');
        d.classList.add('flex110');
        content.appendChild(d);
      }
      break;
    case 'code':
      let code_block = label;
      label.classList.add('code_block');
      label.colSpan = 2;
      for(let i = 0;;) {
        let asm_block = value[i];
        let line = document.createElement('div');
        line.classList.add('code_line');
        line.style.color = '#EF90FF';
        line.innerHTML = '$' + hex_format(asm_block.ptr + MAP_PTR, 4) + ':';
        label.appendChild(line);
        
        for(let j = 0; j < asm_block.asm.length; ++j) {
          let asm = asm_block.asm[j];
          line = document.createElement('div');
          line.classList.add('code_line');
          line.innerHTML = '    <span style="color: #66BBFF">' + asm.name.padEnd(5, ' ') + '</span>';
          let comment;
          if(asm.cmd == 0xCD) {
            switch(asm.v) {
            case _PrintTextEnhanced: comment = '<span style="color: #888888">; PrintTextEnhanced</span>'; break;
            case _CheckEventAndPrintHLIfCompleted: comment = '<span style="color: #888888">; CheckEventAndPrintHLIfCompleted</span>'; break;
            case _CheckItemAndPrintHLIfCompleted: comment = '<span style="color: #888888">; CheckItemAndPrintHLIfCompleted</span>'; break;
            case _CheckEventAndQuitIfCompleted: comment = '<span style="color: #888888">; CheckEventAndQuitIfCompleted</span>'; break;
            }
          }
          
          if(asm.args) {
            let pargs = ' ' + asm.args().join(', ');
            if(comment) pargs = pargs.padEnd(13, ' ') + comment;
            line.innerHTML += pargs;
          }
          label.appendChild(hover_highlight(line, asm.ptr + MAP_PTR, asm.len));
        }          
        if(++i >= value.length) break;
        label.appendChild(document.createElement('br'));
      }
      return row;
    case 'select':
      input = create_select(value, args[0]);
      input.classList.add('flex11');
      input.disabled = true;
      content.appendChild(input);
      break;
    case 'radio':
      for(let i in args[0]) {
        input = document.createElement('input');
        input.setAttribute('type', type);
        input.classList.add('readonly');
        input.value = args[0][i];
        input.name = args[1];
        input.checked = i == value;
        content.appendChild(input);
        
        let l = document.createElement('span');
        l.innerHTML = args[0][i];
        l.classList.add('flex11');
        l.classList.add('sublabel');
        content.appendChild(l);
      }
      break;
    default:
      input = document.createElement('input');
      input.setAttribute('type', type);
      input.classList.add('flex11');
      input.readOnly = true;
      input.value = value;
      content.appendChild(input);
    }
  }
  else for(let i in value) {
    let l = document.createElement('span');
    l.innerHTML = i;
    l.classList.add('sublabel');
    content.appendChild(l);
    
    let c = document.createElement('input');
    c.setAttribute('type', type);
    c.classList.add('flex11');
    c.readOnly = true;
    c.value = value[i];
    content.appendChild(c);
  }
  
  row.appendChild(content);
  return row;
}

function build_spritesheet(id, data) {
  _spr[1]++;
  data = new Uint8Array(data);
  let spritesheet = [];
  let sprite = [];
  for (let i = 0; i < data.length; ++i) {
    let p = data[i];
    sprite.push((p >> 6) & 0x3);
    sprite.push((p >> 4) & 0x3);
    sprite.push((p >> 2) & 0x3);
    sprite.push(p & 0x3);
    if (sprite.length >= TILE_SIZE * TILE_SIZE) {
      spritesheet.push(sprite);
      sprite = [];
    }
  }
  _spr[2]++;
  
  sprites[id] = spritesheet;
}

async function build_tileset(id, data) {
  _tpr[1]++;
  data = new Uint8Array(data);
  let tileset = [];
  let block = [];
  for (let i = 0; i < data.length; ++i) {
    let p = data[i];
    block.push((p >> 6) & 0x3);
    block.push((p >> 4) & 0x3);
    block.push((p >> 2) & 0x3);
    block.push(p & 0x3);
    if (block.length >= 0x20 * 0x20) {
      tileset.push(block);
      block = [];
    }
  }
  _tpr[2]++;
  
  tilesets[id] = tileset;
}

function get_spritesheet(pid, sid) {
  pid = Math.min(Math.max(pid, 0), PALETTES.length) % PALETTES.length;
  let key = (1 << 24) | (pid << 16) | sid;
  let texture = textures[key];
  if (texture !== undefined) return texture;
  
  let spritesheet = sprites[sid];
  if(spritesheet === undefined) return [DEFAULT_TILE];
  
  let sprite_color = [];
  let palette = PALETTES[pid];
  for(let i = 0; i < spritesheet.length; ++i) {
    let sprite = spritesheet[i];
    let img = document.createElement("canvas").getContext("2d");
    img.width = img.height = TILE_SIZE;
    
    let img_data = new ImageData(TILE_SIZE, TILE_SIZE);
    for(let i = 0; i < sprite.length; ++i) {
      let mc = sprite[i];
      let c = palette[mc];
      let index = i * 4;
      img_data.data[index] = c[0];
      img_data.data[index + 1] = c[1]; 
      img_data.data[index + 2] = c[2];
      img_data.data[index + 3] = (mc != 2) * 0xFF;
    }
    img.putImageData(img_data, 0, 0);
    
    sprite_color.push(img);
  }
  
  let s = sprite_color.length;
  if(s > 1) {
    for(let i = (s * 2/3) | 0; i < s; ++i) {
      let cpy = document.createElement("canvas").getContext("2d");
      cpy.width = cpy.height = TILE_SIZE;
      cpy.scale(-1, 1);
      cpy.drawImage(sprite_color[i].canvas, -TILE_SIZE, 0);
      sprite_color.push(cpy);
    }
  }
  
  return textures[key] = sprite_color;
}

function get_block(pid, tid, bid) {
  pid = (Math.min(Math.max(pid, 0), PALETTES.length) % PALETTES.length) * (tid != 0x11);
  let key = (pid << 16) | (tid << 8) | bid;
  let texture = textures[key];
  if (texture !== undefined) return texture;
  
  let tileset = tilesets[tid];
  if(tileset === undefined) return DEFAULT_TILE;
  
  let block = tileset[bid];
  if(block === undefined) return DEFAULT_TILE;
  
  let palette = tid == 0x11 ? CAVE_PALETTE : PALETTES[pid];
  let img = new ImageData(BLOCK_SIZE, BLOCK_SIZE);
  for(let i = 0; i < block.length; ++i) {
    let c = palette[block[i]];
    let index = i * 4;
    img.data[index] = c[0];
    img.data[index + 1] = c[1];
    img.data[index + 2] = c[2];
    img.data[index + 3] = 255;
  }
  
  return textures[key] = img;
}

function render_screen() {
  screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
  screen.strokeStyle = "red";
  screen.lineWidth = 1;
  rendered_maps = [];
  for(i in loaded_maps) loaded_maps[i].render();
}

async function load_map(id, data) {
  _mpr[1]++;
  let map = loaded_maps[id];
  if (map !== undefined) return map;
  map = loaded_maps[id] = new ZZAZZMap(id, data);
  _mpr[2]++;
  map.prerender();
  _mpr[3]++;
}

let _tpr = [Object.keys(TILESET_NAMES).length, 0, 0];
let _spr = [Object.keys(SPRITE_NAMES).length , 0, 0];
let _mpr = [Object.keys(GLOBAL_POS).length   , 0, 0, 0];

async function preload_data() {
  let r = [];
  for(let id in TILESET_NAMES) {
    id = parseInt(id);
    r.push(GET('tilesets/' + hex_format(id, 2), 'arraybuffer', build_tileset, [id]));
  }
  
  for(let id in SPRITE_NAMES) {
    id = parseInt(id);
    r.push(GET('sprites/' + hex_format(id, 2), 'arraybuffer', build_spritesheet, [id]));
  }
  
  await Promise.allSettled(r);
  
  r = [];
  for(let id in GLOBAL_POS) {
    id = parseInt(id);
    r.push(GET('maps/' + hex_format(id, 4), 'text', load_map, [id]));
  }
  
  await Promise.allSettled(r);
}

function offbb(x, y, w, h, bb) {
  let x1 = bb.x + x;
  let y1 = bb.y + y;
  return {x1: x1, x2: x1 + w, y1: y1, y2: y1 + h};
}

function inbb(x, y, bb) {
  return bb.x1 <= x && bb.x2 >= x && bb.y1 <= y && bb.y2 >= y;
}

function loading_render(t) {
  let x = screen.canvas.width / 2;
  let y = screen.canvas.height / 2;
  let hw = screen.canvas.width * 0.3;
  let w = hw + hw;
  
  screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
  screen.strokeStyle = 'white';
  let ix = x - hw - 2;
  let iy = y - 12;
  screen.strokeRect(ix, iy - 80, w + 4, 24);
  screen.strokeRect(ix, iy     , w + 4, 24);
  screen.strokeRect(ix, iy + 80, w + 4, 24);
  
  ix += 2;
  iy += 2;
  
  let sp1 = _spr[1] / _spr[0];
  let sp2 = _spr[2] / _spr[0];
  let tp1 = _tpr[1] / _tpr[0];
  let tp2 = _tpr[2] / _tpr[0];
  let mp1 = _mpr[1] / _mpr[0];
  let mp2 = _mpr[2] / _mpr[0];
  let mp3 = _mpr[3] / _mpr[0];
  
  screen.font = "18px zzazz";
  screen.fillStyle = 'white';
  screen.fillText("Sprites", ix, iy - 90);
  screen.fillText("Tilesets", ix, iy - 10);
  screen.fillText("Maps", ix, iy + 70);
  
  screen.font = "9px zzazz";
  screen.fillStyle = 'yellow';
  screen.fillText("Download " + ((sp1 * 100) | 0) + "%", ix + 100, iy - 90);
  screen.fillText("Download " + ((tp1 * 100) | 0) + "%", ix + 100, iy - 10);
  screen.fillText("Download " + ((mp1 * 100) | 0) + "%", ix + 100, iy + 70);
  screen.fillRect(ix, iy - 80, sp1 * w, 20);
  screen.fillRect(ix, iy     , tp1 * w, 20);
  screen.fillRect(ix, iy + 80, mp1 * w, 20);
  
  screen.fillStyle = 'orange';
  screen.fillText("Parser " + ((mp2 * 100) | 0) + "%", ix + 200, iy + 70);
  screen.fillRect(ix, iy, mp2 * w, 20);
  
  screen.fillStyle = '#66DD66';
  screen.fillText("Parser " + ((sp2 * 100) | 0) + "%", ix + 200, iy - 90);
  screen.fillText("Parser " + ((tp2 * 100) | 0) + "%", ix + 200, iy - 10);
  screen.fillText("Render " + ((mp3 * 100) | 0) + "%", ix + 300, iy + 70);
  screen.fillRect(ix, iy - 80, sp2 * w, 20);
  screen.fillRect(ix, iy     , tp2 * w, 20);
  screen.fillRect(ix, iy + 80, mp3 * w, 20);
  
  if(_mpr[2] < _mpr[0]) {
    requestAnimationFrame(loading_render);
    return;
  }
  
  loaded = true;
  sidebar.classList.remove('hidden');
  
  let _stop_drag = function() { dragging = false; }
  screen.canvas.addEventListener('mousedown', function(e) {
    if(e.button == 2) {
      dragging = true;
      return;
    }
    if(e.button != 0) return;
    let el = document.elementsFromPoint(e.clientX, e.clientY);
    let map = null;
    for(let i = 0; i < el.length; ++i) {
      let m = el[i];
      if(!m.classList.contains('world_layer')) continue;
      map = m;
      break;
    }
    
    if(!map)
      selection = [null, null];
    else {
      let old_map = selection[0];
      if(!old_map || map != old_map.world_layer.canvas)
        selection = [loaded_maps[parseInt(map.getAttribute('map_id'))], null];
      
      let cur_map = selection[0];
      let tile_size = TILE_SIZE * zmul;
      let obj_sel = null;
      let bb = cur_map.object_layer.canvas.getBoundingClientRect();
      let selectables = cur_map.objects.concat(cur_map.warps).concat(cur_map.signs);
      for(let i = 0; i < selectables.length; ++i) {
        let sel = selectables[i];
        if(bb.x + sel.x * tile_size > e.clientX || bb.x + (sel.x + 1) * tile_size < e.clientX ||
           bb.y + sel.y * tile_size > e.clientY || bb.y + (sel.y + 1) * tile_size < e.clientY) continue;
        obj_sel = sel;
        break;
      }
      
      if(obj_sel) selection[1] = selection[1] == obj_sel ? null : obj_sel;
      else if(selection[1]) selection[1] = null;
      else if(old_map == cur_map) selection[0] = null;
    }
    
    if(selection[0]) {
      selection[0].show_properties(properties_container);
      selection[0].show_data(data_container);
    }
    else {
      properties_container.parentNode.parentNode.classList.add('hidden');
      data_container.innerHTML = 'There is no map selected...';
    }
    
    if(selection[1]) selection[1].show_properties(selection[0], object_container);
    else object_container.parentNode.parentNode.classList.add('hidden');
  });
  screen.canvas.oncontextmenu = function() {return false;};
  screen.canvas.addEventListener('mouseup', _stop_drag);
  screen.canvas.addEventListener('mouseout', _stop_drag);
  screen.canvas.addEventListener('mousemove', function(e) {
    if(!dragging) return;
    screen_x -= e.movementX / zmul;
    screen_y -= e.movementY / zmul;
    render_screen();
  });
  
  screen.canvas.addEventListener('wheel', function(e) {
    let d = ((e.deltaY < 0) << 1) - 1;
    zoom += d;
    let smul = zmul;
    zmul = zoom < 0 ? 1 / (1 << -zoom) : 1 << zoom;
    smul = 2 * d * (d < 0 ? smul : zmul);
    screen_x += (screen.canvas.width  / smul) | 0;
    screen_y += (screen.canvas.height / smul) | 0;
    render_screen();
  });
  
  document.addEventListener('mousedown', function(e) {
    if (e.button != 0 || !e.target.classList.contains('resize_handler')) return;
    resize_drag = e.target;
    if(e.timeStamp - resize_reset < 500) {
      let tab = resize_drag.parentNode.parentNode;
      resize_drag.classList.remove('locked');
      tab.classList.remove('locked');
      tab.style.height = 'auto';
      tab.style.flex = '';
    }
    resize_reset = e.timeStamp;
  });
  
  document.addEventListener('mouseup', function(e) {
    resize_drag = null;
  });
  
  document.addEventListener('mousemove', function(e) {
    if(!resize_drag) return false;
    let tab = resize_drag.parentNode.parentNode;
    let container = tab.parentNode;
    
    resize_drag.classList.add('locked');
    tab.classList.add('locked');
    let space = container.offsetHeight;
    for(let i = 0; i < container.children.length; ++i) {
      let el = container.children[i];
      if(el == tab) continue;
      space -= el.classList.contains('locked') ? el.offsetHeight : 21;
    }
    let height = tab.offsetTop - (e.clientY - container.offsetTop) + tab.offsetHeight;
    tab.style.height = (Math.max(21, Math.min(height, space))) + 'px';
    tab.style.flex = '0 0 auto';
  });
  
  render_screen();
}

document.addEventListener("DOMContentLoaded", function() {
  screen = document.getElementById('screen').getContext("2d");
  main = screen.canvas.parentNode;
  sidebar = document.getElementById('sidebar');

  properties_container = document.getElementById('properties_container');
  object_container = document.getElementById('object_container');
  data_container = document.getElementById('data_container');

  screen.canvas.width = document.body.clientWidth;
  screen.canvas.height = document.body.clientHeight;
  
  rendered_maps = [];
  loaded_maps = {};
  tilesets = {};
  textures = {};
  sprites = {};
  selection = [null, null];
  
  DEFAULT_BLOCK = new ImageData(BLOCK_SIZE, BLOCK_SIZE);
  DEFAULT_TILE = new ImageData(TILE_SIZE, TILE_SIZE);
  
  screen_x = -(document.body.clientWidth / 3) | 0;
  screen_y = -(document.body.clientHeight / 3) | 0;
  
  zoom = 0;
  zmul = zoom < 0 ? 1 / (1 << -zoom) : 1 << zoom;
  render_flags = 0x0F;
  
  dragging = false;
  resize_drag = null;
  resize_reset = 0;
  
  loaded = false;
  
  window.addEventListener('resize', function() {
    screen.canvas.width = document.body.clientWidth;
    screen.canvas.height = document.body.clientHeight;
    if(loaded) render_screen();
  });

  requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  requestAnimationFrame(loading_render);
  preload_promise = preload_data();
});