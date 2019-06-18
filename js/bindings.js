function onLinkClick() {
	var str = "<h3>Link info</h3>";

	var keys = Object.keys(this);
	if (this.hasOwnProperty('src') && this.hasOwnProperty('srcport') && this.hasOwnProperty('dst') && this.hasOwnProperty('dstport')) {
		str += "<table>";
		str += "<tr><td>src</td><td>"+this.src+"</td><td>srcport</td><td>"+this.srcport+"</td></tr>";
		str += "<tr><td>dst</td><td>"+this.dst+"</td><td>dstport</td><td>"+this.dstport+"</td></tr>";
		str += "</table>";
	}
	str += "<table>";
	for (var i = 0; i < keys.length; i++) {
		if ((keys[i] != 'src') && (keys[i] != 'srcport') && (keys[i] != 'dst') && (keys[i] != 'dstport') && (keys[i] != 'isEditable')) {
		  str += "<tr><td>"+keys[i]+":</td><td>"+this[keys[i]]+"</td></tr>";
		}
	}
	str += "</table>";
	$("#subpane").html(str);
	$("#subpane").show();
	$("#subpane_close").show();
	$("#leveldescrip").hide();
}

function onDeviceClick() {
	var ip = this.hasOwnProperty("secret") && this.secret ? "<i>secret</i>" : this.id;
	var info = "<h3>Device info</h3><p><img src=\"./includes/"+(this.image||'imac')+".png\"></p><p>IP address: "+ip+"</p>";
	if (this.hasOwnProperty("isEditable") && this.isEditable && this.hasOwnProperty("rules")) {
		var str = "<h4>Routing table <img src=\"./includes/ui/add.png\" width=\"16px\" height=\"16px\" onclick=\"createRuleEditor(devices['"+this.id+"']);\"></h4><table id=\"routingtable\">";
		for (var r = 0; r < this.rules.length; r++) {
			var keys = Object.keys(this.rules[r]);
			str += "<tr>";
			for (var i = 0; i < keys.length; i++) str += "<td>"+keys[i]+":</td><td>"+this.rules[r][keys[i]]+"</td>";
			str += "<td><img src=\"./includes/ui/clear.png\" title=\"Delete\" onclick=\"suppressRule(this, devices['"+this.id+"'],"+r+");\"></td>";
			str += "</tr>";
		}
		info = info + str+"</table>";
	}
	if (this.hasOwnProperty("isEditable") && this.isEditable && this.hasOwnProperty("dv")) {
		var str = "<h4>Distance vector table</h4><table>";
		if (this.hasOwnProperty("type") && (this.type == 'ManualDVRouter')) {
			if (this.active) {
				str = "<h4>Distance vector table <button id=\"editRouter\" onclick=\"deviceScripts.manualDVRouter.onPacketReceived(devices['"+this.id+"'], null, null);\">\
				 <span class=\"ui-button-text\">Edit table</span></button></h4><table>";
			} else {
				str = "<h4>Distance vector table <button id=\"activateRouter\" onclick=\"activateRouter(devices['"+this.id+"']);\">\
				<span class=\"ui-button-text\">Activate router</span></button></h4><table>";
			}
		}
		var keys = Object.keys(this.dv);
		for (var i = 0; i < keys.length; i++) {
			  str += "<tr><td>"+keys[i]+":</td><td>cost: "+this.dv[keys[i]].cost+"</td><td>where: "+this.dv[keys[i]].where+"</td></tr>";
		}
		info = info + str+"</table>";
	}
	$("#subpane").html(info);
	$("#subpane").show();
	$("#subpane_close").show();
	$("#leveldescrip").hide();
}

function activateRouter(d) {
	d.active = true;
	$("#activateRouter span").text("Edit table");
	$("#activateRouter").onclick = function() {deviceScripts.manualDVRouter.onPacketReceived(d, null, null);};
	deviceScripts.manualDVRouter.onPacketReceived(d, null);
}
function suppressRule(e, d, row) {
	//delete(d.rules[row]);
	d.rules.splice(row, 1);
	var tr = e.parentNode.parentNode;
	tr.parentNode.removeChild(tr);
	//d.onDeviceClick();
}

function addRule(d) {
	var dstip = $('#dstip').val();
	var portNum = $('#portNum').val();
	d.rules.push({'dstip':dstip, 'portNum':portNum});
	var t = document.getElementById("routingtable");
	var row=t.insertRow(-1);
	var c0=row.insertCell(0);
	var c1=row.insertCell(1);
	var c2=row.insertCell(2);
	var c3=row.insertCell(3);
	var c4=row.insertCell(4);
	c0.innerHTML='dstip:';
	c1.innerHTML = dstip;
	c2.innerHTML='portNum:'
	c3.innerHTML=portNum;
	c4.innerHTML="<img src=\"./includes/ui/clear.png\" title=\"Delete\" onclick=\"suppressRule(this, devices['"+d.id+"'],"+t.rows.length+");\">";
}

function onPacketClick() {
	var str = "<h3>Packet info</h3>";
	str += onPacketClick_helper("network", this);
	str += onPacketClick_helper("transport", this);
	str += onPacketClick_helper("application", this);

	$("#subpane").html(str);
	$("#subpane").show();
	$("#subpane_close").show();
	$("#leveldescrip").hide();
}

function onPacketClick_helper(layer, pkt) {
	if (!pkt.hasOwnProperty(layer)) return "";

	var keys = Object.keys(pkt[layer]);
	var str = "<h4>"+layer+" layer</h4><table>";
	for (var i = 0; i < keys.length; i++) str += "<tr><td>"+keys[i]+":</td><td>"+pkt[layer][keys[i]]+"</td></tr>";
	return str+"</table>";
}

function onSubpaneClose() {
	$("#subpane").hide();
	$("#subpane_close").hide();
	$("#leveldescrip").show();
}

function btnReset() {
	grpPackets.callAll('kill');
	grpPackets.destroy(true);
	grpPackets = game.add.group();
	game.time.reset();
	if (game.time.slowMotion == 1) btnFast();
	else btnPlay();
	initEvents();
}

function btnPause() {
	game.paused = true;
	pause_.visible = false;
	play_.visible = true;
	fast_.visible = true;
}

function btnPlay() {
	game.time.slowMotion = DEFAULT_GAMESPEED;
	game.paused = false;
	pause_.visible = true;
	play_.visible = false;
	fast_.visible = true;
}

function btnFast() {
	game.time.slowMotion = 1;
	game.paused = false;
	pause_.visible = true;
	play_.visible = true;
	fast_.visible = false;
}

function btnAdd() {
	createPacketEditor(-1, {});
}

function btnEdit() {
	createPacketEditor(this.launcherIndex, playerPackets[this.launcherIndex]);
}

function btnLaunch() {
	var pkt = playerPackets[this.launcherIndex];
	if (devices[pkt.from].locked) return;
	devices[pkt.from].locked = true;

	if (pkt.hasOwnProperty("repeat") && pkt.repeat > 1) {
		for (var i = 0; i < pkt.repeat; i++) {
			game.time.events.add( 100 * i, playPacket, pkt );
		}

		game.time.events.add(100 * (parseInt(pkt.repeat) + 1), launcherUnlock, pkt);
	} else {
		doPacketAnimation(pkt.from, getDefaultRecipient(pkt.from), pkt.payload);
		game.time.events.add(100, launcherUnlock, pkt);
	}
}

function launcherUnlock(index) {
	devices[this.from].locked = false;
}
