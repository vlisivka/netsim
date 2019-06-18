$(document).ready(function(){
	/* todo: this seems to cause noticeable lag but would be really nice to have
	$(window).on('resize orientationChange', function(e) {
		//game.scale.setGameSize($(window).width(), $(window).height());
		$('#pane').css('left', ($(window).width() * 0.7) + 'px');
		$('#pane').css('width', ($(window).width() * 0.3 - 40) + 'px');
		$('#pane').css('height', ($(window).height() - 40) + 'px');
	});*/
	$('[name="username"]').focus();
	$('[type="button"]').button();
});

function sendPacket(src, portnum, payload) {
	doPacketAnimation(src, getPortRecipient(src, portnum), payload);
}

function doPacketAnimation(src, dst, payload) {
	var pkt = grpPackets.create(devices[src].sprite.centerX - 16, devices[src].sprite.centerY - 16, 'packet');
	pkt.inputEnabled = true;
	pkt.events.onInputDown.add(onPacketClick, payload);
	var tween = game.add.tween(pkt);
	pkt.dst = dst;
	pkt.payload = payload;
	pkt.portNum = getRemotePort(src, dst);
	tween.to({x: devices[dst].sprite.centerX - 16, y: devices[dst].sprite.centerY - 16}, 3000, Phaser.Easing.Sinusoidal.InOut);
	tween.onComplete.add(donePacket, pkt);
	tween.start();
}

function createLaunchers() {
	grpLaunchers.callAll('kill');
	grpLaunchers.destroy(true);
	grpLaunchers = game.add.group();

	for (var i = 0; i < playerPackets.length; i++) {
		var edit = grpLaunchers.add( game.add.button(20, 120 + i * 60, 'edit', btnEdit) );
		edit.launcherIndex = i;
		var launch = grpLaunchers.add( game.add.button(80, 120 + i * 60, 'launch', btnLaunch) );
		launch.launcherIndex = i;
	}

	grpLaunchers.add( game.add.button(20, 135 + 60 * playerPackets.length, 'add', btnAdd) );
}

function createRuleEditor(d) {
	var str = "Destination IP: <select id=\"dstip\">";
	for (var i = 0; i < level.devices.length; i++) {
		if (level.devices[i].player) {
			str += "<option>"+level.devices[i].id+"</option>";
		}
	}
	str += "</select><br>";
	str += "Port number: <select id=\"portNum\">";
	for (var i = 0; i < d.ports.length; i++) {
			str += "<option>"+i.toString()+"</option>";
	}
	str += "</select><br>";

	$("#editor").html(str);
	$('#editor').dialog({
		title: d.id + ": add routing rule",
		resizable:false,
		buttons:[
			{ text: "Cancel", click:function() { $(this).dialog("close"); }},
			{ text: "Add" , click:function() { addRule(d); $(this).dialog("close");}}
		]
	});
	$('select').selectmenu();
	$('#editor').show();

}
dveditor = null;
dventries={};
function addDVEntry(device) {
	d=$("#dvselect").val();
	c=$("#dvaddcost").val();
	w=$("#portselect").val();
	if (d in dventries) {alert("You may not add an existing device in distance vector table."); return;}
	if (!c || c=="")  {alert("You should define cost in distance vector table."); return;}
	if (Number(c) < 0) {alert("You may not use negative cost in distance vector table."); return;}
	dventries[d] = {'cost': c, 'where': w};
	$("#dvtable tbody").append("<tr><td class=\"editDevice\">"+d+"</td><td class=\"editCost\">"+c+"</td><td class=\"editWhere\">"+w+"</td></tr>");
	//dveditor = null;
	//dveditor = new SimpleTableCellEditor("dvtable");
	//dveditor.SetEditable('td', { validation : null, formatter : null, keys : {validation: [13],cancellation: [27]}});
	//dveditor.SetEditableClass('editDevice', { validation : function(e) {return e in devices;},formatter : function(e) {return e;}, keys : {validation: [13]}});
	//dveditor.SetEditableClass('editCost', { validation : function(e) {return ($.isNumeric(e) && (Number(e) >=0));},formatter : function(e) {return e;}, keys : {validation: [13]}});
	//dveditor.SetEditableClass('editWhere', { validation : function(e) {return e in device.ports;},formatter : function(e) {return e;}, keys : {validation: [13]}});
}

function updateDV(d, entries) {
		var dvkeys = Object.keys(entries);
		var dvupdated = false;
		for (var i = 0; i < dvkeys.length; i++) {
			device = dvkeys[i];
			if (!(device in d.dv)) { d.dv[device] = {}; dvupdated = true; }
			if (d.dv[device].cost != entries[device].cost) {
				d.dv[device].cost = Number(entries[device].cost);
				dvupdated = true;
			}
			if (d.dv[device].where != entries[device].where) {
				d.dv[device].where = Number(entries[device].where);
				dvupdated = true;
		}
		}
		dveditor = null;
		if (dvupdated) {
			deviceScripts.DVRouter.updateRouting(d);
			deviceScripts.DVRouter.sendDV(d, false);
		}
}
function editDVCell(evt) {
	console.log(`Cell edited : ${evt.element.parentElement.cells.item(0)} from ${evt.oldValue} => ${evt.newValue}`);
	var dv = evt.element.parentElement.cells.item(0).textContent;
	if (evt.element.cellIndex == 1) {
		dventries[dv].cost = evt.newValue;
	} else if (evt.element.cellIndex == 2) {
		dventries[dv].where = evt.newValue;
	}
}

function createDVEditor(d, p, port) {
	game.paused=true;
	var pktstr=null;
	if (p) {
		pktstr="<h4>Incoming packet</h4>";
		var other = p.network.srcip;
		var otherdv = JSON.parse(p.application.payload);
		pktstr += "Received on portNum "+port.toString()+" ("+other+")<br>";
		pktstr += "Cost on port "+port.toString()+" is "+d.costs[port].toString();
		pktstr +=  "<table border=\"1\"><thead><tr><th>Device</th><th>Cost</th></tr></thead><tbody>";
		for (var i=0; i < otherdv.length; i++) {
			pktstr+="<tr><td>"+otherdv[i].dstip+"</td><td>"+otherdv[i].cost.toString()+"</td></tr>";
		}
		pktstr+="</tbody></table>";
		pktstr+="<br/><hr/>";
	}

  var dvstr = "<h4>Distance vector table</h4><table id=\"dvtable\" border=\"1\">";
	//dvstr+="<caption>Edit entries</caption><thead><tr><th>Device</th><th>Cost</th><th>Where</th></tr></thead><tbody>";
	dvstr+="<thead><tr><th style=\"width:150px;\">Device</th><th>Cost</th><th>Where</th></tr></thead><tbody>";
	var dvkeys = Object.keys(d.dv);
	for (var i = 0; i < dvkeys.length; i++) {
			dvstr += "<tr><td class=\"editDevice\">"+dvkeys[i]+"</td><td class=\"editCost\">"+d.dv[dvkeys[i]].cost+"</td><td class=\"editWhere\">"+d.dv[dvkeys[i]].where+"</td></tr>";
	}
	dvstr = dvstr+"</tbody></table>";

	dventries = Object.assign({}, d.dv);
	dvselect="<select id=\"dvselect\">";
	for (var i = 0; i < level.devices.length; i++) {
		if (!(level.devices[i].id in d.dv)) {
			dvselect += "<option>"+level.devices[i].id+"</option>";
		}
	}
	dvselect += "</select>";
	portselect="<select id=\"portselect\">";
	for (var i = 0; i < d.ports.length; i++) {
		//portselect += "<option>portNum "+i.toString()+"--"+d.ports[i]+"</option>";
		portselect += "<option value=\""+i.toString()+"\">portNum "+i.toString()+"</option>";
	}
	portselect += "</select>";
	dvadd = "<fieldset><legend>Add entry</legend> device:"+dvselect + "<br/>cost:<input id=\"dvaddcost\" type=\"number\" min=\"0\"/></br> where: "+portselect+"<br/>";
	dvadd += "<hr/><button onclick=\"addDVEntry(devices['"+d.id+"']);\" style=\"float: right\">Add</button>";
	dvadd+= "</fieldset>";
	var str = dvstr+"<br>"+dvadd;
	if (pktstr) str = pktstr + str;
	$("#editor").html(str);
	dveditor = new SimpleTableCellEditor("dvtable");
	//dveditor.SetEditableClass('editDevice', { validation : function(e) {return e in devices;},formatter : function(e) {return e;}, keys : {validation: [13]}});
	dveditor.SetEditableClass('editCost', { validation : function(e) {return ($.isNumeric(e) && (Number(e) >=0));},formatter : function(e) {return Number(e);}, keys : {validation: [13]}});
	dveditor.SetEditableClass('editWhere', { validation : function(e) {return e in d.ports;},formatter : function(e) {return e;}, keys : {validation: [13]}});
	$("#dvtable").on("cell:edited", function(event) { editDVCell(event);});
	$('#editor').dialog({
		title: d.id + ": Distance vectors",
		resizable:false,
		modal: true,
		scrollable: true,
		buttons:[
			{ text: "Cancel", click:function() { game.paused=false; $(this).dialog("close"); }},
			{ text: "Update" , click:function() { updateDV(d, dventries); game.paused= false; $(this).dialog("close");}}
		]
	});
	//$('select').selectmenu();
	$('#editor').show();
}

function createPacketEditor(index, packet) {
	var str = "Sent from: <select id=\"pktFrom\">";
	for (var i = 0; i < level.devices.length; i++) {
		if (level.devices[i].player) {
			str += "<option"+(packet.from == level.devices[i].id ? " selected" : "")+">"+level.devices[i].id+"</option>";
		}
	}
	str += "</select><br>";

	for (var i = 0; i < packetFields.length; i++) {
		str += "<fieldset><legend>"+packetFields[i].layer+"</legend>";
		for (var j = 0; j < packetFields[i].fields.length; j++) {
			str += packetFields[i].fields[j]+":<br><input type=\"text\" id=\""+packetFields[i].layer+"_"+packetFields[i].fields[j]+"\" value=\""+payloadStr(packet, packetFields[i].layer, packetFields[i].fields[j])+"\"><br>";
		}
		str += "</fieldset>";
	}

	str += "<p>Repeat: <input type=\"text\" id=\"repeat\" style=\"width:40px;\" value=\""+(packet.hasOwnProperty("repeat") ? packet.repeat : 1)+"\"></p>";

	$("#editor").html(str);
	$('#editor').dialog({
		title: index < 0 ? "Add packet" : "Update packet",
		resizable:false,
		buttons:[
			{ text: "Remove", click:function() { deletePlayerPacket(index); createLaunchers(); $(this).dialog("close"); }},
			{ text: index < 0 ? "Add" : "Update", click:function() { updatePlayerPacket(index < 0 ? playerPackets.length : index); createLaunchers(); $(this).dialog("close");}}
		]
	});
	$('select').selectmenu();
	$('#editor').show();
}

function deletePlayerPacket(index) {
	playerPackets.splice(index, 1);
	savePlayerPackets();
}

function updatePlayerPacket(index) {
	playerPackets[index] = {
		from: $("#pktFrom").val(),
		repeat: $("#repeat").val(),
		payload:{}
	};

	for (var i = 0; i < packetFields.length; i++) {
		playerPackets[index].payload[packetFields[i].layer] = {};
		for (var j = 0; j < packetFields[i].fields.length; j++) {
			var val = $("#"+packetFields[i].layer+"_"+packetFields[i].fields[j]).val();
			if (val != "") {
				playerPackets[index].payload[packetFields[i].layer][ packetFields[i].fields[j] ] = val;
			}
		}
	}

	savePlayerPackets();
}

function payloadStr(packet, layer, field) {
	return packet.hasOwnProperty("payload") && packet.payload.hasOwnProperty(layer) && packet.payload[layer].hasOwnProperty(field) ? packet.payload[layer][field] : "";
}

function savePlayerPackets() {
	$.post("./solns.ajax.php?level="+levelid+"&method=save", {
		json:JSON.stringify(playerPackets)
	});
}

function loadPlayerPackets() {
	$.getJSON("./solns.ajax.php?level="+levelid+"&method=load").done(function(data){
		playerPackets = data;
		createLaunchers();
	}).fail(function(jxr, txt, err) {
		console.log("lPP fail: "+txt+", "+err);
	});
}
