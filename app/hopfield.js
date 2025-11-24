import {create, all} from 'mathjs';

const math = create(all);
const N = 64;
const rows = 8;
let patterns = [];
let cellToUpdate = 0;

// returns the energy of the current grid state
// uses old hopfield
export function getSTDEnergy(grid, weights) {
    let flatgrid = grid.flat();
    let result = 0;
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            result += weights[i][j] * flatgrid[i] * flatgrid[j];
        }
    }
    return -0.5 * result;
}

// new energy function of current grid state for dense
export function getNewEnergy(grid, n = 3) {
    // take the dot product of the current state and each input example
    // then pass through rectified polynomial energy function
    // and take the sum over all memories
    let g = grid.flat();
    let result = 0;

    for (let pattern of patterns) {
        let tmp = 0;
        let pf = pattern.flat();
        for (let i = 0; i < N; i++) {
            tmp += pf[i] * g[i];
        }
        result += F(tmp);
    }

    return -result;
}


// fetches jsons in public/letters to find the weights
export async function getHopfieldWeights(selection) {
    // List of letter files to load
    let letterFiles;
    if (selection == 'A-C') {
        letterFiles = ['A.json','B.json','C.json'];
    } else {
        letterFiles = ['A.json','B.json','C.json','D.json','E.json','F.json','G.json'];
    }
    
    for (const file of letterFiles) {
        try {
            const response = await fetch(`/letters/${file}`);
            const data = await response.json();
            patterns.push(data);
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    // memories have been loaded, now create the weights using the outer product
    // Flatten patterns to 1D vectors (14x14 = 196 elements)
    const flattenedPatterns = patterns.map(pattern => pattern.flat());
    const numNeurons = flattenedPatterns[0].length; // Should be 196 for 14x14 grid
    
    let weights = math.zeros([numNeurons, numNeurons]);

    // console.log(flattenedPatterns[0]);

    for (const pattern of flattenedPatterns) {
        const patternVector = math.matrix([pattern]);
        
        let patternTranspose = math.matrix(pattern).resize([N,1]);
        // console.log("pattern", patternVector);
        // create a column vector to hold the transpose

        // console.log("pattern transp", patternTranspose);
        const outerProduct = math.multiply(patternTranspose, patternVector);
        // console.log("outer", outerProduct);
        weights = math.add(weights, outerProduct);
    }

    // take the average by dividing by the number of neurons
    weights = math.divide(weights, N).toArray();


    // remove the values on the diagonal because no autapses (connections from a neuron to itself)
    for (let i = 0; i < rows; i++) {
        weights[i][i] = 0;
    }

    // console.log("weights done", weights);

    return weights;
}

// rectified polynomial energy function
function F(x, p=3) {
    if (x > 0) {
        return x ** p;
    } else {
        return 0;
    }
}
// take neuron input to p(neuron is in state 1)
function g(val) {
    return 0.5 * (1 + math.tanh(val*3));
}

// return 1 if rand > val and -1 otherwise
function draw(val) {
    let r = math.random();
    if (val > r) {
        return 1;
    } else {
        return -1;
    }
}

// asynchronous so only updates one cell at a time
export function doDenseHopfieldUpdate(grid) {
    let g = grid.flat();
    for (let z = 0; z < 8; z++) {
    let sum = 0;
    for (let pattern of patterns) {
        let fp = pattern.flat();
        let excludedsump = 0;
        let excludedsumn = 0;
        for (let i = 0; i < N; i++) {
            if (cellToUpdate == i) {
                excludedsumn += -1 * fp[i];
                excludedsump += fp[i];
            } else {
                excludedsumn += g[i] * fp[i];
                excludedsump += g[i] * fp[i];
            }
        }
        sum += F(excludedsump) - F(excludedsumn);
    }
    if (sum > 0) {
        g[cellToUpdate] = 1; 
    } else {
        g[cellToUpdate] = -1; 
    }
    cellToUpdate = (cellToUpdate + 1) % N;
}
    return reshapeArray(g, rows, rows);
}

// performs one Hopfield network update step
// grid: 2D array (14x14) with values -1 or 1
// weights: 2D array (14x14) weight matrix
// returns: updated 2D array (14x14) with values -1 or 1
export function doHopfieldUpdate(grid, weights) {
    // console.log("grid", grid);
    // convert inputs to matricies
    let currentState = math.matrix(grid.flat());
    // console.log("currState", currentState);
    // console.log("weights", weights);


    let W = math.matrix(weights);
    // console.log("W", W);

    // find the input to each neuron (1x14)x(14,14)
    let h = math.multiply(currentState, W);
    // console.log("h", h);

    // convert to probability distribution
    let dist = math.map(h, g);

    // console.log("dist", dist);

    // sample from distribution to get next state
    let newState = math.map(dist, draw);

    console.log(newState);

    // return an NxN array
    let newArr = newState.toArray();
    let ret = reshapeArray(newArr, rows, rows);
    
    return ret;
}

// A helper function to split a flat 1D array into an M x N 2D array
function reshapeArray(flatArray, M, N) {
  const result = [];
  for (let i = 0; i < M; i++) {
    // Slice N elements starting from index i * N
    const row = flatArray.slice(i * N, (i + 1) * N);
    result.push(row);
  }
  return result;
}