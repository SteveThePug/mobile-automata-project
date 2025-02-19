const TAPE_PADDING = 25;
const VISIBLE = 30;

class Tape {
    constructor(arr, head, blank) {
        this.arr = [...Array(TAPE_PADDING).fill(blank), ...arr, ...Array(TAPE_PADDING).fill(blank)];
        this.head = TAPE_PADDING+head;
    }

    to_string(element) {
        return `arr: ${this.arr}, head: ${this.head}`;
    }
}

class MA {
    constructor(n, sigma, gamma, blank, delta, F) {
        this.n = n;
        this.sigma = new Set(sigma);
        this.gamma = [...new Set([...gamma, ...sigma])];
        this.delta = delta;
        this.b = blank;
        this.F = new Set(F);
    }

    step(tape) {
        const slice = tape.arr.slice(tape.head, tape.head + this.n);
        
        // Look up transition in delta
        if (!(slice.join('') in this.delta)) {
            return false;
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
        return `n: ${this.n}, sigma: ${this.sigma}, gamma: ${this.gamma}, blank: ${this.b}, delta: ${JSON.stringify(this.delta)}, b: ${this.b}, F: ${this.F}`;
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

// Initialize tape and MA
let tape = null;
let prev_tape = null;
let ma = null;

// Update tape and MA when inputs change
function updateTapeAndMA() {
    // Create new tape
    const tapeString = $('#input_tape').val();
    const headPosition = parseInt($('#input_head').val());
    const blankSymbol = $('#input_b').val();
    tape = new Tape(tapeString.split(''), headPosition, blankSymbol);

    // Create new MA
    const n = parseInt($('#input_n').val());
    const sigma = parseSymbols($('#input_sigma').val());

    // Ensure gamma contains all symbols from sigma
    const gammaSymbols = parseSymbols($('#input_gamma').val());
    const gamma = [...new Set([...sigma, ...gammaSymbols, blankSymbol])];
    $('#input_gamma').val(gamma.join(',')); // Update input container to show full gamma

    // Get blank symbol and terminating words
    const b = $('#input_b').val();
    const F = $('#input_F').val().split(',').map(s => s.trim()).filter(s => s.length > 0);

    const delta = parseDelta($('#input_delta').val());
    ma = new MA(n, sigma, gamma, b, delta, F);
    renderTape();
}

function initialiseTape() {
    const tapeDiv = $('#output_tape');
    tapeDiv.empty();

    // Add each tape cell
    const radius_visible = VISIBLE/2
    const head = tape.head

    let j = 0
    for (let i = head-radius_visible; i < head+radius_visible; i++) {
        const cell = $('<div>')
            .addClass('border border-gray-400 p-2 min-w-[40px] text-center inline-block')
            .css({
                'margin-right': '0.25rem',
                'position': 'absolute',
                'left': `${j * 40}px`
            })
            .text(tape.arr[i]);
            console.log(i)
        j++;

            
        // Highlight current head position
        if (i === head) {
            cell.addClass('bg-blue-200');
        }
        
        tapeDiv.append(cell);
    }
}

function renderTape() {
    const tapeDiv = $('#output_tape');
    tapeDiv.empty();

    // Add each tape cell
    const radius_visible = VISIBLE/2
    const head = tape.head

    let j = 0
    for (let i = head-radius_visible; i < head+radius_visible; i++) {
        const cell = $('<div>')
            .addClass('border border-gray-400 p-2 min-w-[40px] text-center inline-block')
            .css({
                'margin-right': '0.25rem',
                'position': 'absolute',
                'left': `${j * 40}px`
            })
            .text(tape.arr[i]);
            console.log(i)
        j++;

            
        // Highlight current head position
        if (i === head) {
            cell.addClass('bg-blue-200');
        }
        
        tapeDiv.append(cell);
    }
}

// Add event listeners
$('#input_tape').on('change', updateTapeAndMA);
$('#input_head').on('change', updateTapeAndMA);
$('#input_n').on('change', updateTapeAndMA);
$('#input_sigma').on('change', updateTapeAndMA);
$('#input_gamma').on('change', updateTapeAndMA);
$('#input_delta').on('change', updateTapeAndMA);
$('#input_b').on('change', updateTapeAndMA);
$('#input_F').on('change', updateTapeAndMA);

$('#button_step').on('click', () => {
    if (ma && tape) {
        tape = ma.step(tape);
        renderTape();
    }
});

$('#button_steps').on('click', () => {
    if (ma && tape) {
        tape = ma.t_step(tape, 10);
        renderTape();
    }
});

$('#button_reset').on('click', () => {
    updateTapeAndMA();
});

// Initial setup
updateTapeAndMA();
