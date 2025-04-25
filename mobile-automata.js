// Constant parameters
const CELL_SIZE_PX = 40;

const VISIBLE = 27;
const RADIUS_VISIBLE = Math.floor(VISIBLE/2);

const STEP_DURATION = 1000;
const STEPS_DURATION = 400;

// Animation variables
let executing = false;

// Initialize tape and MA
let tape = null;
let ma = null;
let steps = 10;
let terminated = false;
let acceptingSet = new Set(); // Set of accepting words

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

// Function to show notification message (termination or error)
function showNotification(message, isError = false, isAccepted = false) {
    // Remove any existing notification
    $('#notification-message').remove();
    
    // Determine notification styling based on type
    let bgColor, textColor;
    
    if (isError) {
        bgColor = '#f87171'; // red-400 for errors
        textColor = '#7f1d1d'; // red-900 for errors
    } else {
        // For termination messages
        bgColor = isAccepted ? '#10b981' : '#f87171'; // green-500 for accept, red-400 for reject
        textColor = isAccepted ? '#064e3b' : '#7f1d1d'; // green-900 for accept, red-900 for reject
    }
    
    // Create notification div with initial state (hidden)
    const notificationDiv = $('<div>')
        .attr('id', 'notification-message')
        .css({
            'background-color': bgColor,
            'color': textColor,
            'padding': '0.75rem',
            'border-radius': '0.375rem',
            'font-weight': 'bold',
            'text-align': 'center',
            'margin-top': '1rem',
            'width': '100%',
            'opacity': '0',
            'transform': 'translateY(20px)',
            'transition': 'opacity 0.3s ease, transform 0.3s ease'
        })
        .text(message);
    
    // Append the message after the tape
    $('#output_tape').after(notificationDiv);
    
    // Trigger reflow to ensure transition works
    notificationDiv[0].offsetHeight;
    
    // Animate in
    notificationDiv.css({
        'opacity': '1',
        'transform': 'translateY(0)'
    });
}

// Function to show termination message
function showTerminationMessage() {
    // Get the current word at the head
    const currentWord = tape.arr.slice(tape.head, tape.head + ma.n).join('');
    
    // Check if word is in accepting set
    const isAccepted = acceptingSet.has(currentWord);
    
    // Show notification
    showNotification(
        isAccepted ? 'Machine has terminated and ACCEPTS!' : 'Machine has terminated and REJECTS!',
        false,
        isAccepted
    );
}

// Function to show error message
function showErrorMessage(message) {
    showNotification(message, true);
}

// Function to hide notification message
function hideNotification() {
    const notification = $('#notification-message');
    
    if (notification.length) {
        // Animate out
        notification.css({
            'opacity': '0',
            'transform': 'translateY(20px)'
        });
        
        // Remove after transition completes
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

class Tape {
    constructor(arr, head, blank_symbol, div_id) {
        // Pad the array to make sure that we have enough visible cells populating the machine
        const PAD_LEFT = Math.max(0, RADIUS_VISIBLE-head);
        const PAD_RIGHT = Math.max(0, VISIBLE-(PAD_LEFT+arr.length));
        this.arr = [...Array(PAD_LEFT).fill(blank_symbol), ...arr, ...Array(PAD_RIGHT).fill(blank_symbol)];
        this.head = PAD_LEFT+head;
        this.blank_symbol = blank_symbol;
        this.div = $(div_id)
    }

    // Empty HTML and prepare div
    clear_div() {
        this.div.empty();
        this.div
            .css({
                'position': 'relative',
                'overflow': 'hidden',
                'width': `${(VISIBLE-2)*CELL_SIZE_PX}px`,
                'height': `${3*CELL_SIZE_PX}px`
            });

        // Populate div with cells centered around the head
        // Store active_cells of tape in this.active_cells
        // Store inactive_cells (from previous inputs) in this.inactive_cells
        this.active_cells = [];
        this.inactive_cells = [];
    }

    redraw_div() {
        // Clear div
        this.clear_div()

        // Make cells and populate the div
        let j = 0;
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

    display_output(output) {
        this.lower_inactive_cells();

        for (let i = 0; i < output.length; i++) {
            // Add cell to head position (starts at the RADIUS_VISIBLE cell)
            const cell = make_cell(output[i], RADIUS_VISIBLE*CELL_SIZE_PX + i*CELL_SIZE_PX, CELL_SIZE_PX);
            
            // Apply transition only if page is visible
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

    replace_input_with_output(output) {
        if (output) {
            const [out_arr, direction] = output;
            // Update array holding tape
            this.arr.splice(this.head, out_arr.length, ...out_arr)
            // Update HTML
            this.display_output(out_arr);
            if (direction == 1) {
                tape.move_tape_left();
            } else {
                tape.move_tape_right();
            }
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
            terminated = true;
            // Show termination message when no valid transition exists
            showTerminationMessage();
            return false;
        }

        return this.delta[input.join('')];
    }

    step(tape) {
        const slice = tape.arr.slice(tape.head, tape.head + this.n);
        
        // Look up transition in delta
        if (!(slice.join('') in this.delta)) {
            terminated = true;
            // Show termination message when no valid transition exists
            showTerminationMessage();
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
    if (str.trim() === '') {
        throw new Error('Transition function cannot be empty');
    }

    const delta = {};
    const lines = str.split('\n');
    let determinedN = null;
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const parts = line.split(',').map(s => s.trim());
        if (parts.length !== 3) {
            throw new Error(`Invalid transition format: ${line} (should be "input, output, direction")`);
        }
        
        const [input, output, direction] = parts;
        
        if (direction !== 'L' && direction !== 'R') {
            throw new Error(`Invalid direction in transition: ${line} (must be L or R)`);
        }
        
        // Check if all inputs and outputs have the same length
        if (determinedN === null) {
            determinedN = input.length;
        } else if (input.length !== determinedN) {
            throw new Error(`Inconsistent input length in transition: ${line} (expected ${determinedN} characters)`);
        }
        
        if (output.length !== determinedN) {
            throw new Error(`Input and output must have the same length in transition: ${line}`);
        }
        
        if (input in delta) {
            throw new Error(`Duplicate transition for input: ${input}`);
        }
        
        delta[input] = [output.split(''), direction === 'R' ? 1 : -1];
    }
    
    return { delta, n: determinedN || 1 }; // Default to 1 if no transitions
}

// Generate all possible n-length words from gamma
function generateAllPossibleWords(gamma, n) {
    const result = [];
    
    function backtrack(current) {
        if (current.length === n) {
            result.push(current);
            return;
        }
        
        for (const symbol of gamma) {
            backtrack(current + symbol);
        }
    }
    
    backtrack('');
    return result;
}

// Parse accepting words
function parseAcceptingWords(str) {
    return new Set(str.split(',').map(s => s.trim()).filter(s => s.length > 0));
}

// Update tape and MA when inputs change
function loadMA() {
    terminated = false;
    // Hide any existing notification message when resetting
    hideNotification();
    
    try {
        const blank_symbol = $('#input_b').val();
        if (!blank_symbol || blank_symbol.length !== 1) {
            throw new Error('Blank symbol must be a single character');
        }
        
        const tapeString = $('#input_tape').val();
        const headPosition = parseInt($('#input_head').val());
        
        if (isNaN(headPosition)) {
            throw new Error('Head position must be a number');
        }
        
        // Parse delta and determine n
        const { delta, n } = parseDelta($('#input_delta').val());
        
        // Update n in the UI
        $('#input_n').val(n);
        
        // Derive sigma from input tape symbols
        const inputSymbols = new Set(tapeString.split(''));
        inputSymbols.add(blank_symbol);
        const sigma = [...inputSymbols];
        $('#input_sigma').val(sigma.join(','));
        
        // Derive gamma from all symbols in delta and sigma
        const gammaSet = new Set(sigma);
        
        // Add all symbols from delta inputs and outputs
        Object.entries(delta).forEach(([input, [output, _]]) => {
            for (const char of input) {
                gammaSet.add(char);
            }
            for (const char of output) {
                gammaSet.add(char);
            }
        });
        
        const gamma = [...gammaSet];
        $('#input_gamma').val(gamma.join(','));
        
        // Generate all possible words and determine F (non-transitions)
        const allPossibleWords = generateAllPossibleWords(gamma, n);
        const F = allPossibleWords.filter(word => !(word in delta));
        $('#input_F').val(F.join(','));
        
        // Parse accepting words
        acceptingSet = parseAcceptingWords($('#input_A').val());
        
        // Validate accepting words
        for (const word of acceptingSet) {
            if (word.length !== n) {
                throw new Error(`Accepting word "${word}" must have length ${n}`);
            }
            
            // Check if all symbols in accepting words are in gamma
            for (const char of word) {
                if (!gammaSet.has(char)) {
                    throw new Error(`Symbol "${char}" in accepting word "${word}" is not in gamma`);
                }
            }
        }
        
        // Create new MA
        ma = new MA(n, sigma, gamma, blank_symbol, delta, F);

        // Create new tape
        tape = new Tape(tapeString.split(''), headPosition, blank_symbol, '#output_tape');
        tape.redraw_div();
        
    } catch (error) {
        // Display error message
        showErrorMessage(`Error: ${error.message}`);
        return false;
    }
    
    return true;
}

function disableButtons() {
    $('#button_step').prop('disabled', true);
    $('#button_steps').prop('disabled', true); 
    $('#button_reset').prop('disabled', true);
}

function enableButtons() {
    $('#button_step').prop('disabled', false);
    $('#button_steps').prop('disabled', false);
    $('#button_reset').prop('disabled', false);
}

// Add input event listeners
$('#input_tape').on('change', loadMA);
$('#input_head').on('change', loadMA);
$('#input_delta').on('change', loadMA);
$('#input_b').on('change', loadMA);
$('#input_A').on('change', loadMA);

// Make fields read-only
$('#input_n').attr('readonly', true);
$('#input_sigma').attr('readonly', true);
$('#input_gamma').attr('readonly', true);
$('#input_F').attr('readonly', true);

// step the MA
function stepMA(duration=STEP_DURATION) {
    disableButtons();
    
    // Only set transition if page is visible
    tape.div.css('transition-duration', `${duration-50}ms`);

    if (ma && tape && !terminated) {
        let input = tape.arr.slice(tape.head, tape.head + ma.n)
        output = ma.get_output(input);
        tape.replace_input_with_output(output);
    }

    enableButtons();
}

function multiStepMA() {
    disableButtons();
    let count = 0;
    
    const doStep = () => {
        if (count < 10 && !terminated) {
            stepMA(STEPS_DURATION);
            count++;
            setTimeout(doStep, STEPS_DURATION);
        } else {
            enableButtons();
        }
    };

    doStep();
}

// Button event listeners
$('#button_step').on('click', () => {
    if (ma && tape) {
        stepMA();
    } else {
        showErrorMessage('Machine is not properly configured');
    }
});

$('#button_steps').on('click', () => {
    if (ma && tape) {
        multiStepMA();
    } else {
        showErrorMessage('Machine is not properly configured');
    }
});

$('#button_reset').on('click', () => loadMA());

// Initial load
$(document).ready(() => {
    try {
        loadMA();
    } catch (error) {
        showErrorMessage(`Initialization error: ${error.message}`);
    }
});
