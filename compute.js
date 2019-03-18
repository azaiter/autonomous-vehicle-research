// NOTE: THIS IS OLD INACCURATE CODE THAT DOESN'T USE THE ZDIVE ALGORITHIM

// const routes = require("./routes.1");
const routes = require("./nasserRoutes");
const polyline = require("@mapbox/polyline");
const turf = require("@turf/turf");

console.log(routes.length);

let edges = [];

for (let i = 0; i < routes.length; i++) {
	let routeObj = JSON.parse(routes[i]);
	//console.log(routeObj);
	edges.push(calculateEdges(routeObj.routes[0].overview_path));
}

// calculate the probability
let hitsArr = [];
let pointHits = {};
for (let i = 0; i < edges.length; i++) {
	let oneRouteEdges = edges[i];
	for (let j = 0; j < oneRouteEdges.length; j++) {
		let hits = 0;
		let edgeInOneRoute = oneRouteEdges[j];
		for (let k = 0; k < edges.length; k++) {
			let oneRouteEdgesK = edges[k];
			for (let l = 0; l < oneRouteEdgesK.length; l++) {
				let edgeInOneRouteL = oneRouteEdgesK[l];
				if (edgeInOneRouteL.start.lat == edgeInOneRoute.start.lat && edgeInOneRouteL.start.lng == edgeInOneRoute.start.lng &&
					edgeInOneRouteL.end.lat == edgeInOneRoute.end.lat && edgeInOneRouteL.end.lng == edgeInOneRoute.end.lng
				) {
					hits++;
				}
				if (edgeInOneRouteL.start.lat == edgeInOneRoute.start.lat
					&& edgeInOneRouteL.start.lng == edgeInOneRoute.start.lng
				) {
					if (pointHits[`${edgeInOneRouteL.start.lat},${edgeInOneRouteL.start.lng}`]) {
						pointHits[`${edgeInOneRouteL.start.lat},${edgeInOneRouteL.start.lng}`]++;
					}
					else {
						pointHits[`${edgeInOneRouteL.start.lat},${edgeInOneRouteL.start.lng}`] = 1;
					}
				}
			}
		}
		//console.log(`hits for ${pointToString(edgeInOneRoute.start)}, ${pointToString(edgeInOneRoute.end)} : ${hits}`);
		hitsArr.push({
			start: edgeInOneRoute.start,
			end: edgeInOneRoute.end,
			hits: hits
		});
	}
}

hitsArr.sort((a, b) => a.hits - b.hits);
let pointHitsArr = [];
for (const k in pointHits) {
	if (pointHits.hasOwnProperty(k)) {
		const x = pointHits[k];
		pointHitsArr.push({
			point: k,
			hits: x
		});
	}
}
pointHitsArr.sort((a, b) => b.hits - a.hits);

// hitsArr.map(x=>console.log(`
// ${pointToString(x.start)},test${x.hits},#FF0000
// ${pointToString(x.end)},test${x.hits},#FF0000
// `));
// console.log("################################");

// STEP 1: get the point where we have a mix zone. (one point for now until we get proper algorithm to find all of them)
console.log(`most hits is on ${pointHitsArr[0].point} with ${pointHitsArr[0].hits} hits.`);

let pointOfMixZone = {
	lat: pointHitsArr[2].point.split(",")[0],
	lng: pointHitsArr[2].point.split(",")[1]
};

let pointOfMixZone2 = {
	lat: pointHitsArr[63].point.split(",")[0],
	lng: pointHitsArr[63].point.split(",")[1]
};
/*
print out top 10 possible points of mix zones.
*/

for (let i = 0; i < 100; i++) {
	const x = pointHitsArr[i];
	console.log(`Candidate #${i}: ${x.point} with ${x.hits} hits`);
}

// we selected #49 (40.72124,-73.97456000000001) for this use case with 36 hits

//console.log(`parsed point check: ${pointToString(pointOfMixZone)}`);

// STEP 2: split all the paths on that point in the graph
// in : one array of whole path, out: two arrays of two paths split
function pointEquals(a, b) {
	return (a.lat == b.lat && a.lng == b.lng);
}
function splitPathOnPoint(pathArr, mixZonePoint) {
	let indexOfSplit = 0;
	for (let i = 0; i < pathArr.length; i++) {
		const x = pathArr[i];
		//console.log(`xxxx: ${JSON.stringify(x)}`)
		if (x) {
			if (pointEquals(x.start, mixZonePoint) || pointEquals(x.end, mixZonePoint)) {
				indexOfSplit = i;
				break;
			}
		}
	}
	//console.log(`split index ${indexOfSplit}`)
	let arr2 = JSON.parse(JSON.stringify(pathArr));
	let arr = arr2.splice(0, indexOfSplit);
	arr2.unshift(arr[arr.length - 1]);
	return {
		path1: arr,
		path2: arr2
	};
}


// STEP 3: make function to check if sub-graph is part of full graph

function isGraphInAGraph(gA, gB) {
	gA = gA.filter(x => x && x.start && x.end);
	gB = gB.filter(x => x && x.start && x.end);
	let smallerGraph = gA.length < gB.length ? gA : gB;
	let biggerGraph = gA.length >= gB.length ? gA : gB;
	if (smallerGraph.length == 0) return false;
	if (biggerGraph.length == 0) return false;
	for (let i = 0; i < smallerGraph.length; i++) {
		const e1 = smallerGraph[i];
		const e2 = biggerGraph[i];
		// console.log(`edddge: ${JSON.stringify(e1)} ####  ${JSON.stringify(e2)} `)
		// console.log(`
		// ############################
		// graphA: ${JSON.stringify(gA)}
		// graphB: ${JSON.stringify(gB)}
		// ############################
		// `);
		if (!(pointEquals(e1.start, e2.start) && pointEquals(e1.end, e2.end))) {
			// console.log(`
			// NOT MATCH!!
			// graphA: ${JSON.stringify(gA)}
			// graphB: ${JSON.stringify(gB)}
			// `);
			return false;
		}
	}
	// console.log(`
	// MATCH!!
	// graphA: ${JSON.stringify(gA)}
	// graphB: ${JSON.stringify(gB)}
	// `);
	return true;
}

// STEP 4: iterate trough all of them , split on that point and generate probabilities
let trajectories = [[], [], []]; // only cover the case of one mix zone

// generate trajectories for before + after split
for (let i = 0; i < edges.length; i++) {
	const oneRouteEdges = edges[i];
	let splitPaths = splitPathOnPoint(oneRouteEdges, pointOfMixZone);
	trajectories[0].push({
		path: splitPaths.path1,
		id: `${i}-1`
	});
	let splitPaths2 = splitPathOnPoint(splitPaths.path2, pointOfMixZone2);
	trajectories[1].push({
		path: splitPaths2.path1,
		id: `${i}-2`
	});
	trajectories[2].push({
		path: splitPaths2.path2,
		id: `${i}-3`
	});
}

/*
0-1-2
it belongs to route 0
first path (first trajectory)
if it is a hit on 2nd route
*/
let probabilities = {};
// 0, 1, 2

// trajectories.forEach((trajectoryArray, k) => { // for each sub-path (ie. x=>MixZone=>y, where x,y are i in this arr)
// 	trajectoryArray.forEach((trajectory, j) => { // for each path in this subPathes collection
// 		for (let i = 0; i < edges.length; i++) { // iterate through paths.
// 			const oneRouteEdges = edges[i];
// 			/*
// 				join the two trajectories
// 				compare with the full route
// 			*/
// 			if (isGraphInAGraph(trajectory.path, oneRouteEdges)) {
// 				if (probabilities[`${trajectory.id}-${i}-${k+1}`]) {
// 					probabilities[`${trajectory.id}-${i}-${k+1}`]++;
// 				}
// 				else {
// 					probabilities[`${trajectory.id}-${i}-${k+1}`] = 1;
// 				}
// 			}
// 			else {
// 				//probabilities[`${trajectory.id}-${i}-${k+1}`] = 0;
// 			}
// 		}
// 	});
// });



trajectories.forEach((trajectory1, trajectory1Index)=>{
	trajectories.forEach((trajectory2, trajectory2Index)=>{
		if(trajectory1Index !== trajectory2Index && trajectory1Index+1 == trajectory2Index){
			trajectory1.forEach((firstTrajectory, firstTrajectoryIndex)=>{
				trajectory2.forEach((secondTrajectory, secondTrajectoryIndex)=>{
					let joinedTrajectoryPath = firstTrajectory.path.concat(secondTrajectory.path);
					edges.forEach((oneRouteEdges, routeIndex)=>{
						if(firstTrajectory.path.length > 0 && secondTrajectory.path.length >0){
							console.log(`length1: ${firstTrajectory.path.length}, length2: ${secondTrajectory.path.length} , lengthoneRouteEdges: ${oneRouteEdges.length}`);
							console.log(`${trajectory1Index}	${trajectory2Index}	${firstTrajectoryIndex}	${secondTrajectoryIndex}	${routeIndex}`);
						}
						if (isGraphInAGraph(joinedTrajectoryPath, oneRouteEdges) && firstTrajectory.path.length !=0 && secondTrajectory.path.length !=0) {
							console.log(`${trajectory1Index}	${trajectory2Index}	${firstTrajectoryIndex}	${secondTrajectoryIndex}	${routeIndex}`);
						}
					});
				});
			})
		}
	});
});


console.log(`
PROBABILITIES:
${JSON.stringify(probabilities)}
`);



// test function:
// let obj = splitPathOnPoint(edges[1]);
// console.log(`
// ####### split path test function ######
// full path: ${JSON.stringify(edges[1])}
// split1 : ${JSON.stringify(obj.path1)}
// split2 : ${JSON.stringify(obj.path2)}
// `);

//pointHitsArr.map(x=>console.log(`${(x.point)}, most hits ${x.hits}`));

function pointToString(point) {
	return `${point.lat}, ${point.lng}`;
}

function calculateEdges(arr) {
	return arr.map((x, i, a) => {
		if (i <= a.length - 2) {
			return {
				start: x,
				end: a[i + 1]
			};
		}
		else {
			return false;
		}
	}).filter(x => x);
}

// routes.forEach(response => {
// 	let points = [];
// 	response.json.routes[0].legs[0].steps.forEach( (step) => {
// 		polyline.decode(step.polyline.points).forEach( (point) => {
// 			points.push([point[1], point[0]])
// 		})
// 	});
// 	let linestring = turf.lineString(points);
// 	let snapped = turf.nearestPointOnLine(linestring, turf.point([77.59464, 12.9726]));
// 	console.log(snapped.properties.dist);
// });
