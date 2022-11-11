//Pull beatmap info from osu servers
async function getBeatmapInfo() {
    let file = "https://osu.ppy.sh/api/get_beatmaps?k=" + apiKeys.osu + "&b=";
    let beatmap = document.getElementById("beatmap-input").value;

    //Get difficulty id from beatmap link
    if(beatmap.search(/[/]/i) != -1) {
        beatmap = beatmap.slice(beatmap.lastIndexOf("/") + 1);
        console.log(beatmap);
    }

    //Check for invalid beatmap ids
    if(isNaN(beatmap) == false && beatmap != "") {
        file += beatmap;
    } else {
        document.getElementById("pp").innerHTML = "Invalid ID";
        return;
    }

    //Get responce from osu
    let result = fetch(file).then((response) => response.json())
    .then((beatmapInfo) => {
        beatmapInfo = beatmapInfo[0];
        console.log(beatmapInfo);
        //Check if beatmap exists
        if(beatmapInfo == undefined) {
            document.getElementById("pp").innerHTML = "Beatmap does not exists";
            return;
        }
        //Check if beatmap is taiko
        if(beatmapInfo.mode != 1) {
            document.getElementById("pp").innerHTML = "Incorrect game mode. Please select a Taiko map";
            return;
        }

        //Update text fields with beatmap info
        document.getElementById("strain").value = beatmapInfo.difficultyrating;
        document.getElementById("numcircles").value = beatmapInfo.max_combo;
        document.getElementById("od-input").value = beatmapInfo.diff_overall;
        
        //Recalculate everything
        setActive("acc");
        displayOD();
        calcPP();
        
    });
}

window.addEventListener("DOMContentLoaded", function() {
    
    //Run functions to calculate everything
    setActive("acc");
    displayOD();
    calcPP();
    
    //Mods
    var ez = document.getElementById("EZ");
    var hr = document.getElementById("HR");
    var ht = document.getElementById("HT");
    var dt = document.getElementById("DT");
    
    //Prevent conflicting mods
    ez.addEventListener("click", uncheck(hr));
    hr.addEventListener("click", uncheck(ez));
    ht.addEventListener("click", uncheck(dt));
    dt.addEventListener("click", uncheck(ht));
    
    //Update info when user input is detected
    var inputs = document.getElementsByTagName('input');
    for(var i in inputs){
        switch(inputs[i].type) {
            case "number":
                inputs[i].addEventListener("input", calcPP);
                break;
            case "checkbox":
                inputs[i].addEventListener("click", calcPP);
                inputs[i].addEventListener("click", displayOD);
                break;
        }
    }
});

//Get element
function setActive(name) {
    activeInput = name;
    if(name == "acc") {
        document.getElementById("acc").className = "active";
        document.getElementById("100s").className = "inactive";
    } else {
        document.getElementById("acc").className = "inactive";
        document.getElementById("100s").className = "active";
    }
    
}

//Uncheck elements
function uncheck(elem) {
    return function() {
        elem.checked = false;
    };
}

//Scale OD for mods
function scaleOd(od) {
    if (document.getElementById("EZ").checked){
        od /= 2;
    }
    if (document.getElementById("HR").checked){
        od *= 1.4;
    }
    od = Math.max(Math.min(od, 10), 0);
    return od;
};

//Calculate the hit window
function hitWindow(od){
    od = scaleOd(od);
    
    let hitWindow = 35

    if (od > 5) {
        hitWindow += (20 - 35) * (od - 5) / 5
    } else if (od < 5) {
        hitWindow -= (35 - 50) * (5 - od) / 5
    }
    
    //Mod calculation
    if (document.getElementById("HT").checked){
        hitWindow /= 0.75;
    }
    if (document.getElementById("DT").checked){
        hitWindow /= 1.5;
    }
    // 2 decimals
    return Math.round(hitWindow * 100) / 100;
};

//Display OD and hit window
function displayOD() {
    var od = +document.getElementById("od-input").value;
    var scaled = scaleOd(od);
    scaled = Math.round(scaled * 100) / 100;
    var hitWin = hitWindow(od);
    
    document.getElementById("od-label").textContent = "300 Hit Window: " + hitWin + "ms";
    document.getElementById("od-scaled").textContent = "OD w/mods: " + scaled;
};

//Calculate PP value
function calcPP(){
    //Get info from text fields
    let strain = +document.getElementById("strain").value;
    let hitcount = +document.getElementById("numcircles").value;
    let misses = +document.getElementById("misses").value;
    let usercombo = hitcount - misses;
    let OD300 = hitWindow(+document.getElementById("od-input").value);
    let acc = +document.getElementById("acc").value;
    
    //Calculate miss count
    const effectiveMissCount = Math.max(1.0, 1000.0 / usercombo) * misses;

    let hundreds = -1;

    //Get acc
    if(activeInput == "acc") {
        hundreds = Math.round((1 - misses/hitcount - acc/100)*2*hitcount);
        document.getElementById("100s").value = hundreds;
    } else {
        hundreds = +document.getElementById("100s").value;
        acc = 100*(1 - misses/hitcount - hundreds/2/hitcount);
        // 2 decimals
        document.getElementById("acc").value = Math.round(acc * 100) / 100;
    }
    
    //Check for invalid inputs
    if(strain < 0 || hitcount <= 0 || misses < 0 || usercombo < 0 || acc < 0 || acc > 100 || OD300 < 0 ||
    (misses + hundreds) > hitcount || hundreds < 0){
        document.getElementById("pp").innerHTML = "Something is wrong with at least one of your inputs."
        return;
    }

    //Calculate values for PP
    let strainValue = Math.pow(5 * Math.max(1.0, strain / 0.115) - 4.0, 2.25) / 1150.0;
    let strainLengthBonus = 1 + 0.1 * Math.min(1.0, hitcount / 1500.0);
    let accLengthBonus = Math.min(1.15, Math.pow(hitcount / 1500.0, 0.3))

    strainValue *= strainLengthBonus;
    strainValue *= Math.pow(0.986, effectiveMissCount);
    strainValue *= Math.pow(acc / 100, 2.0);

    let accValue = Math.pow(60.0 / OD300, 1.1) * Math.pow(acc / 100, 8.0) * Math.pow(strain, 0.4) * 27.0;
    accValue *= Math.min(Math.pow(hitcount / 1500, 0.3), 1.15);

    //Mod multipliers
    let globalMultiplier = 1.13;
    if (document.getElementById("HD").checked){
        globalMultiplier *= 1.075
        strainValue *= 1.025
    }

    if (document.getElementById("EZ").checked) {
        globalMultiplier *= 0.975
        strainValue *= 0.985
    }

    if (document.getElementById("FL").checked){
        strainValue *= 1.05 * strainLengthBonus
    }

    if (document.getElementById("HR").checked) {
        strainValue *= 1.05
    }

    if (document.getElementById("HD").checked && document.getElementById("FL").checked) {
        accValue *= Math.max(1.050, 1.075 * accLengthBonus);
    }

    //Final caluclation
    let totalValue = Math.pow(Math.pow(strainValue, 1.1) + Math.pow(accValue, 1.1), 1.0 / 1.1) * globalMultiplier;

    //Update DOM
    document.getElementById("pp").innerHTML = Math.round(totalValue * 1000) / 1000 + " pp";
    
};