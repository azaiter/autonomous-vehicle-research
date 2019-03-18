const routes = require("./nasserRoutes");
const turf2 = require("turf-point-on-line");
const turf = require("@turf/turf");
const uuidv4 = require('uuid/v4');

let numberOfPoints = 0;
// let shortestPaths = routes.map(x=>{
//     x = JSON.parse(x);
//     let points = JSON.parse(JSON.stringify(x.routes[0].overview_path));
//     return points;
// });

let shortestPaths = [
    [
        {"lat":0,"lng":6},
        {"lat":1,"lng":6},
        {"lat":1,"lng":5},
        {"lat":2,"lng":5},
        {"lat":3,"lng":5},
        {"lat":5,"lng":3},
    ]
    ,
    [
        {"lat":0,"lng":5},
        {"lat":1,"lng":5},
        {"lat":2,"lng":5},
        {"lat":3,"lng":5},
        {"lat":5,"lng":7},
    ]
];

console.log(`
points:

${JSON.stringify(shortestPaths)}
`);

// find highest hits of points.
let pointToString = (p)=>{return `${p.lat},${p.lng}`;};
let stringToPoint = (s)=>{return {
    lat: s.split(",")[0],
    lng: s.split(",")[1]
}};

let pointsHitsObj = {};

shortestPaths.forEach(pointsArr=>{
    pointsArr.forEach(point=>{
        numberOfPoints++;
        if(pointToString(point) in pointsHitsObj){
            pointsHitsObj[pointToString(point)]++;
        }
        else{
            pointsHitsObj[pointToString(point)] = 1;
        }
    });
});



let pointsHitsArr = [];
for(k in pointsHitsObj){
    let obj = {};
    let point = stringToPoint(k);
    let hits = pointsHitsObj[k];
    obj["point"] = point;
    obj["hits"] = hits;
    pointsHitsArr.push(obj);
}

let numOfPointVerify = 0;
pointsHitsArr.sort((a,b)=>a.hits-b.hits).map(x=>{
    numOfPointVerify += x.hits;
    console.log(`point: ${pointToString(x.point)} | hits: ${x.hits}`);
});

console.log(`numberOfPoints: ${numberOfPoints}`)
console.log(`numOfPointVerify: ${numOfPointVerify}`)

// split into two mix zones:
// 1: 42.65227,-83.22304000000001 with 4 hits
// 2: 42.659850000000006,-83.22366000000001 with 5 hits

let mixZone1Point = stringToPoint("1,5");
let mixZone2Point = stringToPoint("3,5");

let pointsEqual = (p1,p2)=>{return (p1.lat == p2.lat && p1.lng == p2.lng)};
let pointInPointsArr = (point, arr)=>{
    for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if(pointsEqual(point, p)){
            return i;
        }
    }
    return false;
};

let trajectories = [[],[],[]]; // for paths that hit both of the mix zones
let pathsIndexesWith100PercentProbability = []; // for the paths that didn't hit any of the mix zones
let pathsIndexesHitFirstMixZoneOnly = [];
let pathsIndexesHitSecondMixZoneOnly = [];
shortestPaths.forEach((shortestPath, shortestPathIndex)=>{
    let lineStringData = shortestPath.map(x=>{return [x.lng,x.lat]});

    let hasFirstMixZonePoint = pointInPointsArr(mixZone1Point, shortestPath);
    let hasSecondMixZonePoint = pointInPointsArr(mixZone2Point, shortestPath);

    let line = turf.lineString(lineStringData);

    let mixZone1Pt = turf.point([mixZone1Point.lng, mixZone1Point.lat]);
    let hasFirstMixZonePointTurf = turf.booleanWithin(mixZone1Pt, line);

    let mixZone2Pt = turf.point([mixZone2Point.lng, mixZone2Point.lat]);
    let hasSecondMixZonePointTurf = turf.booleanWithin(mixZone2Pt, line);

    if(hasFirstMixZonePoint){
        console.log(`path with index ${shortestPathIndex} has first mix zone point with point index of ${hasFirstMixZonePoint}`)
    }
    if(hasSecondMixZonePoint){
        console.log(`path with index ${shortestPathIndex} has second mix zone point with point index of ${hasSecondMixZonePoint}`)
    }
    if(hasFirstMixZonePointTurf){
        console.log(`Math geospatial verification: path with index ${shortestPathIndex} has first mix zone point`)
    }
    if(hasSecondMixZonePointTurf){
        console.log(`Math geospatial verification: path with index ${shortestPathIndex} has second mix zone point`)
    }

    if(!hasFirstMixZonePoint && !hasSecondMixZonePoint){
        pathsIndexesWith100PercentProbability.push(shortestPathIndex);
    }
    if(hasFirstMixZonePoint && !hasSecondMixZonePoint){
        pathsIndexesHitFirstMixZoneOnly.push(shortestPathIndex);
    }
    if(!hasFirstMixZonePoint && hasSecondMixZonePoint){
        pathsIndexesHitSecondMixZoneOnly.push(shortestPathIndex);
    }

    if(hasFirstMixZonePoint && hasSecondMixZonePoint && hasFirstMixZonePoint < hasSecondMixZonePoint){
        let pathUntilFirstMixZone = [];
        let pathBetweenMixZones = [];
        let pathFrom2ndMixZoneToEnd = [];
        shortestPath.forEach((pt, i)=>{
            if(i<=hasFirstMixZonePoint){
                pathUntilFirstMixZone.push(pt);
            }
            else if(i>hasFirstMixZonePoint && i<= hasSecondMixZonePoint){
                pathBetweenMixZones.push(pt);
            }
            else {
                pathFrom2ndMixZoneToEnd.push(pt);
            }
        });
        trajectories[0].push(pathUntilFirstMixZone);
        trajectories[1].push(pathBetweenMixZones);
        trajectories[2].push(pathFrom2ndMixZoneToEnd);
        console.log(`======= Trajectories for shortest path #${shortestPathIndex} ========`);
        console.log(`** pathUntilFirstMixZone: ${JSON.stringify(pathUntilFirstMixZone)}`);
        console.log(`** pathBetweenMixZones: ${JSON.stringify(pathBetweenMixZones)}`);
        console.log(`** pathFrom2ndMixZoneToEnd: ${JSON.stringify(pathFrom2ndMixZoneToEnd)}`);
        console.log(`=====================================================================`);

        console.log("============= NEW IDs of a CAR: ========================")
        console.log(`The car that has the id of #${shortestPathIndex} could be referred to as id #${trajectories[0].length-1} in the diving algorithm`)
        console.log("========================================================")
    }
});

console.log(`trajectory1Index	trajectory2Index	firstTrajectoryIndex	secondTrajectoryIndex	rshortestPathIndex`);
trajectories.forEach((trajectory1, trajectory1Index)=>{
	trajectories.forEach((trajectory2, trajectory2Index)=>{
		if(trajectory1Index !== trajectory2Index && trajectory1Index+1 == trajectory2Index){
			trajectory1.forEach((firstTrajectory, firstTrajectoryIndex)=>{
				trajectory2.forEach((secondTrajectory, secondTrajectoryIndex)=>{
                    let joinedTrajectoryPath = firstTrajectory.concat(secondTrajectory).map(x=>{return [x.lng,x.lat]});
                    let joinedTrajectoryLine = turf.lineString(joinedTrajectoryPath);
					shortestPaths.forEach((shortestPath, rshortestPathIndex)=>{
                        let shortestPathConverted = shortestPath.map(x=>{return [x.lng,x.lat]});
                        let shortestPathLine = turf.lineString(shortestPathConverted);
						// if(firstTrajectory.path.length > 0 && secondTrajectory.path.length >0){
						// 	console.log(`length1: ${firstTrajectory.path.length}, length2: ${secondTrajectory.path.length} , lengthoneRouteEdges: ${oneRouteEdges.length}`);
						// 	console.log(`${trajectory1Index}	${trajectory2Index}	${firstTrajectoryIndex}	${secondTrajectoryIndex}	${routeIndex}`);
						// }
						if (turf.booleanWithin(joinedTrajectoryLine, shortestPathLine)) {
							console.log(`${trajectory1Index}	${trajectory2Index}	${firstTrajectoryIndex}	${secondTrajectoryIndex}	${rshortestPathIndex}`);
						}
					});
				});
			})
		}
	});
});


/*
Diving algorithm:
- Give each car's trajectory a uuid.
- Start at first trajectory of each cars.
- Apply the Z-Diving algorithm.
- ZDive(currentCombinedTrajectory, currentLevel, shortestPathsArr):
    - Base case: if it matches a shortest path 100% return and print
    - Recursive case: otherwise, loop through the same level of trajectories that are a part of a shortest path and call them recursively.
*/

// step 1: giving each trajectory a uuid

let divingTrajectories = [[], [], []];

trajectories.forEach((t, i) => { // each trajectory portion i is trajectory portion
    t.forEach((p, j)=>{ // each sub-path in a portion, j is car id
        let uuid = uuidv4();
        let obj = {
            tID: uuid,
            tPath: JSON.parse(JSON.stringify(p))
        };
        console.log(`the ${i}th trajectory of car with id #${j} has id of: ${uuid}`);
        divingTrajectories[i].push(obj);
    });
});

console.log("Doing the diving Algorithm");

function dive(currentCombinedTrajectories, currentLevel, shortestPathsArr){
    // base case: if it matches any shortest path 100% return and print
    let combinedTrajectoriesLine = getLineFromCombinedTrajectories(currentCombinedTrajectories);
    for (let i = 0; i < shortestPathsArr.length; i++) {
        const shortestPath = shortestPathsArr[i];
        let shortestPathPoints = shortestPath.map(x=>{return [x.lng,x.lat]});
        let shortestPathLine = turf.lineString(shortestPathPoints);
        if(turf.booleanEqual(shortestPathLine, combinedTrajectoriesLine)){
            let uuidsStr = "";
            currentCombinedTrajectories.map(x=>{
                uuidsStr += `, ${x.tID}`;
            });
            console.log(`The path of uuids "${uuidsStr}" is a shortest path for the car with id #${i}`);
            return;
        }
    }
    // Recursive case: otherwise, loop through the same level of trajectories
    // that are a part of a shortest path and call them recursively.
    if(currentLevel+1 == divingTrajectories.length) return;
    divingTrajectories[currentLevel+1].forEach((nextPath, i)=>{
        let currentCombinedTrajectoriesCopy = JSON.parse(JSON.stringify(currentCombinedTrajectories));
        // console.log("##### currentCombinedTrajectoriesCopy START #####")
        // console.log(JSON.stringify(currentCombinedTrajectoriesCopy))
        // console.log("##### currentCombinedTrajectoriesCopy END #####")
        let toBeTestedCombinedPath = JSON.parse(JSON.stringify(currentCombinedTrajectoriesCopy.concat(nextPath)));
        // console.log("##### toBeTestedCombinedPath START #####")
        // console.log(JSON.stringify(toBeTestedCombinedPath))
        // console.log("##### toBeTestedCombinedPath END #####")
        let toBeTestedCombinedLine = getLineFromCombinedTrajectories(toBeTestedCombinedPath);
        for (let i = 0; i < shortestPathsArr.length; i++) {
            const shortestPath = shortestPathsArr[i];
            let shortestPathPoints = shortestPath.map(x=>{return [x.lng,x.lat]});
            let shortestPathLine = turf.lineString(shortestPathPoints);
            if(turf.booleanWithin(toBeTestedCombinedLine, shortestPathLine)){
                return dive(toBeTestedCombinedPath, currentLevel+1, shortestPathsArr);
            }
        }
    });
}

// console.log("############## diving Obj #########")
// console.log(JSON.stringify(divingTrajectories));
// console.log("############## diving Obj END #########")

function getLineFromCombinedTrajectories(arr){
    let combinedPath = [];
    for (let i = 0; i < arr.length; i++) {
        const x = arr[i];
        // console.log("############## arr  x START #########");
        // console.log(JSON.stringify(x));
        // console.log("############## arr x END #########");
        x.tPath.map(j=>{combinedPath.push([j.lng,j.lat])})
        //combinedPath.push(pathToPush);
    }
    // arr.forEach((x, i)=>{
    //     combinedPath = combinedPath.concat(x.tPath).map(j=>{return [j.lng,j.lat]})
    // });
    // console.log("############ COMBINED PATH ###############");
    // console.log(JSON.stringify(combinedPath));
    return turf.lineString(combinedPath);
}

// do the dive

divingTrajectories[0].forEach(x=>{
    let trajectoriesArr = [];
    trajectoriesArr.push(x);
    dive(trajectoriesArr, 0, shortestPaths);
});