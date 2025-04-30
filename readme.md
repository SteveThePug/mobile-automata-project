# Mobile Automata Project

This is my final year project at the University of Leeds exploring mobile automata - a variant of Turing machines where the transition function takes multiple symbols as input and output.

The project consists of two main components:

## 1. Interactive Mobile Automata Simulator

A web-based simulator that allows you to:

- Define and run mobile automata with custom transition functions
- Visualize the tape contents and head movement in real-time
- Step through computations manually or automatically
- Save and load automaton configurations

To use the simulator:
1. Open `index.html` in a web browser
2. Follow the instructions provided on the page to:
   - Enter tape contents and head position
   - Define transition functions
   - Set accepting words and blank symbol
   - Use the control buttons to run the automaton

## 2. Busy Beaver to Mobile Automata Conversion

A Jupyter notebook (`python_notebooks/bb.ipynb`) that demonstrates:

- Converting a 5-state Busy Beaver Turing machine into an equivalent mobile automaton
- Visualizing the computation history using color-coded images
- Analysis of the conversion process and resulting behavior

The notebook includes:
- Implementation of the conversion algorithm
- Visualization code for computation traces
- Example runs and generated images

## Requirements

- Web browser with JavaScript enabled (for simulator)
- Python 3.x with Jupyter, NumPy, and PIL installed (for notebook)

## Usage

1. For the simulator:
   - Open `index.html` in a web browser
   - No additional installation required

2. For the Busy Beaver notebook:
   - Install required Python packages
   - Open `python_notebooks/bb.ipynb` in Jupyter
   - Run cells sequentially to see the conversion and visualization

## Implementation Details

The simulator is built using:
- HTML/CSS (with Tailwind CSS)
- JavaScript (with jQuery)
- Custom animation and state management

The Busy Beaver conversion uses:
- Python scientific computing libraries
- Custom visualization algorithms
- State machine transformation logic