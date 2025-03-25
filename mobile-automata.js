// Constant parameters
const CELL_SIZE_PX = 40;

const VISIBLE = 27;
const RADIUS_VISIBLE = Math.floor(VISIBLE/2);

const STEP_DURATION = 400
const STEPS_DURATION = 1000

// Animation variables
let isPageVisible = true;
let animationPaused = false;

// Initialize tape and MA
let tape = null;
let ma = null;
let terminated = false;
let steps = 10000;

document.addEventListener('visibilitychange', function() {
  isPageVisible = document.visibilityState === 'visible';
  
  if (!isPageVisible) {
    // Pause any active animations when tab is hidden
    animationPaused = true;
    $('.active_cells, .inactive_cells').css('transition', 'none');
  } else {
    // Resume animations when tab becomes visible again
    animationPaused = false;
    $('.active_cells, .inactive_cells').css('transition', 'all ease-in-out');
    $('.active_cells, .inactive_cells').css('transition-duration', `${STEP_DURATION-50}ms`);
  }
});

function make_cell(val, left_px, top_px=CELL_SIZE_PX) {
    return $('<div>')
        .css({
            'padding': '0.5rem',
            'border': '2px solid #9ca3af',
            'textAlign': 'center',
            'display': 'inline-block',
            'transition': 'all ease-in-out',
            'transition-duration': 'inherit',
            'position': 'absolute',
            'left': `${left_px-CELL_SIZE_PX}px`, 
            'top': `${top_px}px`,
            'height': `${CELL_SIZE_PX}px`,
            'width': `${CELL_SIZE_PX}px`
        })
        .text(val);
}

class Tape {
    constructor(arr, head, blank_symbol) {
        // Pad the array to make sure that we have enough visible cells populating the machine
        const PAD_LEFT = Math.max(0, RADIUS_VISIBLE-head);
        const PAD_RIGHT = Math.max(0, VISIBLE-(PAD_LEFT+arr.length));
        this.arr = [...Array(PAD_LEFT).fill(blank_symbol), ...arr, ...Array(PAD_RIGHT).fill(blank_symbol)];
        this.head = PAD_LEFT+head;

        // Empty HTML and prepare div
        this.blank_symbol = blank_symbol;
        this.div = $('#output_tape');
        this.div.empty();
        this.div
            .css({
                'position': 'relative',
                'overflow': 'hidden',
                'width': `${(VISIBLE-2)*CELL_SIZE_PX}px`,
                'height': `${3*CELL_SIZE_PX}px`
            });

        // Populate div with cells centered around the head
        // Store active_cells in this.active_cells
        // Store inactive_cells in this.inactive_cells
        let j = 0;
        this.active_cells = [];
        this.inactive_cells = [];
        for (let i = this.head-RADIUS_VISIBLE; i <= this.head+RADIUS_VISIBLE; i++) {
            const cell = make_cell(this.arr[i], j * (CELL_SIZE_PX));
            j++;

            // Color cells that describe the head
            if (i >= this.head && i < this.head+ma.n) {
                cell.css('border-color', '#3730a3'); // indigo-800 color
            } else {
                cell.css('border-color', '#9ca3af'); // gray-400 color
            }
            
            this.active_cells.push(cell);
            this.div.append(cell);
        }
    }

    replace_input_with_output(output) {
        if (output) {
            const [outarr, direction] = output;
            // Update array holding tape
            this.arr.splice(this.head, outarr.length, ...outarr)
            // Update HTML
            this.display_output(outarr);
            if (direction == 1) {
                tape.move_tape_left();
            } else {
                tape.move_tape_right();
            }
        }
    }

    display_output(output) {
        this.lower_inactive_cells();

        for (let i = 0; i < output.length; i++) {
            // Add cell to head position (starts at the RADIUS_VISIBLE cell)
            const cell = make_cell(output[i], RADIUS_VISIBLE*CELL_SIZE_PX + i*CELL_SIZE_PX, CELL_SIZE_PX);
            
            // Apply transition only if page is visible
            if (!isPageVisible) {
                cell.css('transition', 'none');
            }
            
            this.div.append(cell);

            // Move previous cell to inactive cell
            const old = this.active_cells[RADIUS_VISIBLE + i];
            old.css('opacity', '25%');
            this.active_cells[RADIUS_VISIBLE + i] = cell;
            this.inactive_cells.push(old);
            
            cell.css('top', `${CELL_SIZE_PX}px`);
            old.css('top', `${2*CELL_SIZE_PX}px`);
        }
    }

    lower_inactive_cells() {
        // Move them down
        this.inactive_cells.forEach(cell => {
            const currentTop = parseFloat(cell.css('top'));
            cell.css('top', `${currentTop + CELL_SIZE_PX}px`);
        });

        // Drop excess inactive cells if we have more than 2*ma.n
        while (this.inactive_cells.length > 2 * ma.n) {
            const cell = this.inactive_cells.shift();
            cell.remove();
        }
    }

    move_tape_left() {
        let idx_to_get = this.head+RADIUS_VISIBLE+1;
        if (idx_to_get == this.arr.length) {
            this.arr.push(this.blank_symbol);
        }

        // Find the child to append
        const cell = make_cell(this.arr[idx_to_get], VISIBLE*CELL_SIZE_PX);
        this.div.append(cell);
        this.active_cells.push(cell);

        this.active_cells.forEach((cell, i) => {
            if (!isPageVisible) {
                cell.css('transition', 'none');
            }
            // Convert px to % of parent div width
            const currentLeft = parseFloat(cell.css('left'))
            // Move left
            cell.css('left', `${currentLeft - CELL_SIZE_PX}px`);

            if (i >= RADIUS_VISIBLE+1 && i < RADIUS_VISIBLE+ma.n+1) {
                cell.css('border-color', '#3730a3'); // indigo-800
            } else {
                cell.css('border-color', '#9ca3af'); // gray-400
            }
        });

        this.inactive_cells.forEach(cell => {
            const currentLeft = parseFloat(cell.css('left'))
            cell.css('left', `${currentLeft - CELL_SIZE_PX}px`);
        });

        // Remove the first cell
        this.active_cells.shift().remove();

        this.head++
    }

    move_tape_right() {
        // Check if the element exists at the beginning
        let idx_to_get = this.head-RADIUS_VISIBLE-1;
        if (idx_to_get == -1) {
            this.arr.unshift(this.blank_symbol);
            this.head++
            idx_to_get++
        }
        // Find the child to append on the left hand side
        const cell = make_cell(this.arr[idx_to_get], -CELL_SIZE_PX);
        this.div.prepend(cell);
        this.active_cells.unshift(cell);

        this.active_cells.forEach((cell, i) => {
            if (!isPageVisible) {
                cell.css('transition', 'none');
            }
            // Convert px to % of parent div width
            const currentLeft = parseFloat(cell.css('left'))
            // Move right
            cell.css('left', `${currentLeft + CELL_SIZE_PX}px`);

            if (i >= RADIUS_VISIBLE && i < RADIUS_VISIBLE+ma.n) {
                cell.css('border-color', '#3730a3'); // indigo-800
            } else {
                cell.css('border-color', '#9ca3af'); // gray-400
            }
        });

        this.inactive_cells.forEach(cell => {
            const currentLeft = parseFloat(cell.css('left'));
            cell.css('left', `${currentLeft + CELL_SIZE_PX}px`);
        });

        // Remove the last cell
        this.active_cells.pop().remove();
        this.head--
    }

    to_string(element) {
        return `arr: ${this.arr}, head: ${this.head}`;
    }
}

class MA {
    constructor(n, sigma, gamma, blank_symbol, delta, F) {
        this.n = n;
        this.sigma = new Set(sigma);
        this.gamma = [...new Set([...gamma, ...sigma])];
        this.delta = delta;
        this.b = blank_symbol;
        this.F = new Set(F);
    }

    get_output(input) {
        // Look up transition in delta
        if (!(input.join('') in this.delta)) {
            return false;
        }

        return this.delta[input.join('')];
    }

    step(tape) {
        const slice = tape.arr.slice(tape.head, tape.head + this.n);
        
        // Look up transition in delta
        if (!(slice.join('') in this.delta)) {
            terminated = true;
            return tape;
        }

        // Apply transition by replacing slice with output
        const [outarr, direction] = this.delta[slice.join('')];
        tape.arr.splice(tape.head, this.n, ...outarr);
        tape.head += direction;
        
        return tape;
    }

    t_step(tape, t) {
        for (let i = 0; i < t; i++) {
            tape = this.step(tape);
        }
        return tape;
    }

    to_string() {
        return `n: ${this.n}, sigma: ${this.sigma}, gamma: ${this.gamma}, blank_symbol: ${this.b}, delta: ${JSON.stringify(this.delta)}, b: ${this.b}, F: ${this.F}`;
    }
}

// Parse comma-separated string into array
function parseSymbols(str) {
    const symbols = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    for (const symbol of symbols) {
        if (symbol.length !== 1) {
            throw new Error('Each symbol must be a single character');
        }
    }
    return symbols;
}

// Parse delta function string into object
function parseDelta(str) {
    const delta = {};
    const lines = str.split('\n');
    for (const line of lines) {
        if (line.trim() === '') continue;
        const [input, output, direction] = line.split(',').map(s => s.trim());
        if (direction !== 'L' && direction !== 'R') {
            throw new Error('Direction must be L or R');
        }
        delta[input] = [output, direction === 'R' ? 1 : -1];
    }
    return delta;
}


// Update tape and MA when inputs change
function loadMA() {
    terminated = false;

    const blank_symbol = $('#input_b').val();

    // Create new MA
    const n = parseInt($('#input_n').val());
    const sigma = parseSymbols($('#input_sigma').val());

    // Ensure gamma contains all symbols from sigma
    const gammaSymbols = parseSymbols($('#input_gamma').val());
    const gamma = [...new Set([...sigma, ...gammaSymbols, blank_symbol])];
    $('#input_gamma').val(gamma.join(',')); // Update input container to show full gamma

    // Get blank_symbol symbol and terminating words
    const b = $('#input_b').val();
    const F = $('#input_F').val().split(',').map(s => s.trim()).filter(s => s.length > 0);

    const delta = parseDelta($('#input_delta').val());
    ma = new MA(n, sigma, gamma, b, delta, F);

    // Create new tape
    const tapeString = $('#input_tape').val();
    const headPosition = parseInt($('#input_head').val());
    tape = new Tape(tapeString.split(''), headPosition, blank_symbol);
}


// Add event listeners
$('#input_tape').on('change', loadMA);
$('#input_head').on('change', loadMA);
$('#input_n').on('change', loadMA);
$('#input_sigma').on('change', loadMA);
$('#input_gamma').on('change', loadMA);
$('#input_delta').on('change', loadMA);
$('#input_b').on('change', loadMA);
$('#input_F').on('change', loadMA);

function stepMA(duration=STEP_DURATION) {
    const button = $('#button_step');
    if (button.prop('disabled') || animationPaused) return;
    
    // Only set transition if page is visible
    if (isPageVisible) {
        tape.div.css('transition-duration', `${duration-50}ms`);
    } else {
        tape.div.css('transition', 'none');
    }

    if (ma && tape) {
        button.prop('disabled', true);
        setTimeout(() => button.prop('disabled', false), duration);

        let input = tape.arr.slice(tape.head, tape.head + ma.n)
        output = ma.get_output(input);
        tape.replace_input_with_output(output);
    }
}

function multiStepMA() {
    const button = $('#button_steps');
    if (button.prop('disabled') || animationPaused) return;

    button.prop('disabled', true);
    
    let count = 0;
    const doStep = () => {
        if (animationPaused) {
            // If animations are paused, wait and check again
            setTimeout(() => {
                if (!animationPaused) {
                    doStep();
                } else {
                    button.prop('disabled', false);
                }
            }, 500);
            return;
        }
        
        stepMA(STEPS_DURATION);
        count++;
        if (count < steps) {
            setTimeout(doStep, STEPS_DURATION);
        } else {
            button.prop('disabled', false);
        }
    };

    doStep();
}

$('#button_step').on('click', () => stepMA());
$('#button_steps').on('click', () => multiStepMA());
$('#button_left').on('click', () => tape.move_tape_left());
$('#button_right').on('click', () => tape.move_tape_right());

$('#button_reset').on('click', () => {
    loadMA();
});

loadMA();