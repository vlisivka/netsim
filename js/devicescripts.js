var deviceScripts = {
	manualRouter: {
		onPacketReceived: function(device, packet, portNum) {
			var newpkt = JSON.parse(JSON.stringify(packet));

			if (packet.hasOwnProperty("transport") && packet.transport.hasOwnProperty("proto") && packet.transport.proto == "ICMP" && packet.transport.hasOwnProperty("ttl")) {
				if (packet.transport.ttl > 0) {
					newpkt.transport.ttl--;
				} else {
					newpkt.network.srcip = device.id;
					newpkt.network.dstip = packet.network.srcip;
					newpkt.transport.proto = "ICMP_ERROR";
					sendPacket(device.id, portNum, newpkt);
					return;
				}
			}

			if (packet.hasOwnProperty("network") && packet.network.hasOwnProperty("dstip") && packet.network.dstip == device.id &&
			    packet.hasOwnProperty("transport") && packet.transport.hasOwnProperty("proto") && packet.transport.proto == "ICMP") {
			    	newpkt.network.srcip = device.id;
				newpkt.network.dstip = packet.network.srcip;
				sendPacket(device.id, portNum, newpkt);
				return;
			}
			var noroute = true;
			for (var i = 0; i < device.rules.length; i++) {
				if (device.rules[i].dstip == packet.network.dstip) {
					sendPacket(device.id, device.rules[i].portNum, newpkt);
					noroute = false;
				}
			}
			if (noroute) {
				newpkt.transport={'proto': 'ICMP_NOROUTE'};
				newpkt.network.srcip = device.id;
		    newpkt.network.dstip = packet.network.srcip;
		    sendPacket(device.id, portNum, newpkt);
			}
		}
	},
  DVRouter : {
		onInit: function(device) {
			device.dv = {};
			var neighboors_port = Object.keys(device.ports);
			for (var i = 0; i < neighboors_port.length; i++) {
				device.dv[device.ports[neighboors_port[i]]] = {'cost': device.costs[neighboors_port[i]], 'where': neighboors_port[i]};
			}
			deviceScripts.DVRouter.updateRouting(device);
			deviceScripts.DVRouter.sendDV(device, true);
		},
		updateRouting: function(device) {
			var dindex = Object.keys(device.dv);
			for (var i=0; i < dindex.length; i++) {
				did = dindex[i];
				d = devices[did];
				if (d.hasOwnProperty('type') && (d.type == 'Computer')) {
					irule = device.rules.findIndex(function(e) {return (e.dstip == did);});
					if (irule != -1) {
						device.rules[irule].portNum = device.dv[did].where;
					} else {
						device.rules.push({'dstip': did, 'portNum': device.dv[did].where});
					}
				}
			}
		},
		sendDV: function(device, oninit) {
			var payload = [];
			var dindex = Object.keys(device.dv);
			for (var i=0; i < dindex.length; i++) {
				did = dindex[i];
				payload.push({'dstip': did, 'cost': device.dv[did].cost});
				}
			var neighboors_port = Object.keys(device.ports);
			for (var i = 0; i < neighboors_port.length; i++) {
				var destid = device.ports[neighboors_port[i]];
				var d = devices[destid];
				if (d.hasOwnProperty('type') && ((d.type == 'DVRouter') || (d.type == 'ManualDVRouter'))) {
					var pkt = {};
					pkt.network = {};
					pkt.network.srcip = device.id;
					pkt.network.dstip = destid;
					pkt.application = {};
					pkt.application.type = "DV";
					pkt.application.payload = JSON.stringify(payload);
					if (oninit) {
						if (!level.hasOwnProperty('timeline')) level.timeline = [];
						level.timeline.push({'type': 'packetport', 'at':500, 'from': device.id, 'port': neighboors_port[i],'payload': pkt})
					}
					else
						sendPacket(device.id, neighboors_port[i], pkt);
				}
			}
		},
		onPacketReceived: function(device, packet, portNum) {
			if (packet.hasOwnProperty('application') && packet.application.hasOwnProperty('type') && (packet.application.type == 'DV')) {
				if (packet.network.dstip != device.id) {
					alert('Ouch! received a Distance vector packet for someone else. Discarding packet');
					return;
				}
				var dvupdated = false;
				var from = packet.network.srcip;
				var fromcost = device.costs[portNum];
				var otherdv = JSON.parse(packet.application.payload);
				for (var i=0; i<otherdv.length; i++) {
					try {
						var otherdstip = otherdv[i].dstip;
						if (otherdstip == device.id) continue;
						var othercost = otherdv[i].cost;
						if (!device.dv.hasOwnProperty(otherdstip)) {
							dvupdated = true;
							device.dv[otherdstip] = {'cost': fromcost + othercost, 'where': portNum};
						} else {
							if ((fromcost + othercost) < device.dv[otherdstip].cost) {
								dvupdated=true;
								device.dv[otherdstip].cost = fromcost + othercost;
								device.dv[otherdstip].where = portNum;
								}
							}
						} catch (a) {
					alert('Malformed Distance vector packet');
					return;
					}
				}
				if (dvupdated) {
				  deviceScripts.DVRouter.updateRouting(device);
				  deviceScripts.DVRouter.sendDV(device, false);
				}
				return;
			}
			deviceScripts.manualRouter.onPacketReceived(device, packet, portNum);
		}
	},
	manualDVRouter: {
		onPacketReceived: function (device, packet, portNum) {
			if (device.active) {
				if ((!packet) || (packet.hasOwnProperty('application') && packet.application.hasOwnProperty('type') && (packet.application.type == 'DV'))) {
					//alert(device.id + ' receives a packet.');
					createDVEditor(device, packet, portNum);
					return;
				}
				deviceScripts.manualRouter.onPacketReceived(device, packet, portNum);
			}
		}
	},
	hub: {
		onPacketReceived: function (device, packet) {
			//.
		}
	},

	// proxy device for attacks1. again, this is quick'n'dirty for the workshop
	proxy: {
		onPacketReceived: function(device, packet, portNum) {
			var newpkt = JSON.parse(JSON.stringify(packet));

			if (packet.network.dstip == "Proxy") {
				newpkt.network.dstip = "Blocked Site";
			}

			sendPacket(device.id, portNum == 0 ? 1 : 0, newpkt);
		}
	},

    ping: {
		onPacketReceived: function(device, packet) {
                    if(packet.hasOwnProperty("transport") && packet["transport"].hasOwnProperty("proto")){
                        var proto = packet.transport.proto.trim().toLowerCase();
			if (proto == "icmp" || proto == "example") { // did this to make basics5 a little more clear
                            var new_packet = {
                                network: {
                                    srcip: packet.network.dstip,
                                    dstip: packet.network.srcip
                                },
                                transport: {
                                    proto: proto == "icmp" ? 'ICMP_REPLY' : proto
                                }
                            };
                            sendPacket(device.id, 0, new_packet);
                        }
                    }
		}
    },
	modem: {
		onPacketReceived: function(device, packet, portNum) {
			if (!device.hasOwnProperty("rules")) device.rules = {};
			var newpkt = JSON.parse(JSON.stringify(packet));

			if (packet.network.dstip == device.id) {
				// TODO: use something other than proto for NAT table
				var p = packet.transport.proto;
				if (packet.transport.proto == 'ICMP_REPLY') {
					p = 'ICMP';
				}
				if (device.rules.hasOwnProperty( p )) {
					newpkt.network.dstip = device.rules[p].dstip;
					sendPacket(device.id, device.rules[p].portNum, newpkt);
				}
			} else {
				if (packet.hasOwnProperty("transport") && packet.transport.hasOwnProperty("proto")) {
					device.rules[packet.transport.proto] = {portNum:portNum, dstip: packet.network.srcip};
				}
				newpkt.network.srcip = device.id;
				sendPacket(device.id, 0, newpkt);
			}
		}
	},

/*            if(packet.network.dstip == device.id){//look up ip in NAT table
                var new_packet = {};
                for (var i = 0; i < packetFields.length; i++) {
                    if(packet.hasOwnProperty(packetFields[i].layer)){
                        new_packet[packetFields[i].layer] = {};
                        for (var j = 0; j < packetFields[i].fields.length; j++) {
                            if(packet[packetFields[i].layer].hasOwnProperty(packetFields[i].fields[j])){
                                new_packet[packetFields[i].layer][ packetFields[i].fields[j] ] = packet[packetFields[i].layer][ packetFields[i].fields[j] ];
                            }
                        }
                    }
                }
                new_packet.network.dstip = getPortRecipient(device.id, 0);
                sendPacket(device.id, 0, new_packet);
            } else { //replace src ip with device IP and save in NAT table
                var new_packet = {};
                for (var i = 0; i < packetFields.length; i++) {
                    if(packet.hasOwnProperty(packetFields[i].layer)){
                        new_packet[packetFields[i].layer] = {};
                        for (var j = 0; j < packetFields[i].fields.length; j++) {
                            if(packet[packetFields[i].layer].hasOwnProperty(packetFields[i].fields[j])){
                                new_packet[packetFields[i].layer][ packetFields[i].fields[j] ] = packet[packetFields[i].layer][ packetFields[i].fields[j] ];
                            }
                        }
                    }
                }
                new_packet.network.srcip = device.id;
                sendPacket(device.id, 1, new_packet);
            }

        }
    },*/
    switch: {
        onPacketReceived: function(device, packet, portNum) {
            var found = false;
            for (var i = 0; (i < device.rules.length) && !found; i++) {
                if (device.rules[i].dstip == packet.network.dstip) {
                    sendPacket(device.id, device.rules[i].portNum, packet);
                    found = true;
                }
            }
            if(!found){
                //broadcast packet to all ports except where it was received
                for(var i=0; i<device.ports.length; i++){
                    if(i != portNum){
                        sendPacket(device.id, i, packet);
                    }
                }
            }
            //update rules with info from this packet
            var found = false;
            for (var i = 0; (i < device.rules.length) && !found; i++) {
                if (device.rules[i].dstip == packet.network.srcip) {
                    device.rules[i].portNum = portNum;
                    found = true;
                }
            }
            if(!found){
                device.rules[device.rules.length] = {
                    dstip: packet.network.srcip,
                    portNum: portNum
                }
            }
        }
    },
    firewall: {
        onPacketReceived: function(device, packet) {

            function checkRules(rule){
                return rule.srcip == packet.network.srcip;
            }

            if(device.rules.find(checkRules) == undefined){
                sendPacket(device.id, 0, packet);
            }

        }
    },
    broadcast: {
        onPacketReceived: function(device, packet, portNum){
            function checkRules(rule){
                return rule.dstip == packet.network.dstip;
            }

            var rule = device.rules.find(checkRules);
            if (rule != undefined){
                sendPacket(device.id, rule.portNum, packet);
            } else {
                if(packet.network.dstip == "Broadcast"){
                    for(var i=0; i<device.ports.length; i++){
                        if((i != portNum) && (getPortRecipient(device.id, i) != "Wikipedia")){
                            newPacket = copyPacket(packet);
                            newPacket.network.dstip = getPortRecipient(device.id, i);
                            sendPacket(device.id, i, newPacket);
                        }
                    }
                }
            }
        }
    },
    encryption: {
        onPacketReceived: function(device, packet, portNum) {
            if(packet.hasOwnProperty("transport") && packet["transport"].hasOwnProperty("proto")){
                if(packet.transport.proto == "encryption"){
                    if(packet.hasOwnProperty("application") && packet["application"].hasOwnProperty("type")){
                    var type = packet.application.type;
                    switch(type) {
                        case "keyrequest":
                            var new_packet = {
                                network: {
                                    srcip: packet.network.dstip,
                                    dstip: packet.network.srcip
                                },
                                transport: {
                                    proto: "encryption"
                                },
                                application: {
                                    type: "keyresponse",
                                    key: "123456"
                                }
                            }
                            sendPacket(device.id, portNum, new_packet);
                        break;
                        case "keyresponse":
                            var new_packet = {
                                network: {
                                    srcip: packet.network.dstip,
                                    dstip: packet.network.srcip
                                },
                                transport: {
                                    proto: "encryption"
                                },
                                application: {
                                    type: "message",
                                    key: packet.application.key
                                }
                            }
                            sendPacket(device.id, portNum, new_packet);
                            break;
                        default:
                            break;
                    }
                    }
                }
            }
        }
    },
    tappedRouter: {//Note: port 0 should be hooked up to tap device
        onPacketReceived: function(device, packet, portNum) {
            for (var i = 0; i < device.rules.length; i++) {
                if (device.rules[i].dstip == packet.network.dstip) {
                    if(portNum == 0){
                        sendPacket(device.id, device.rules[i].portNum, packet);
                    } else {
                        sendPacket(device.id, 0, packet);
                    }
                }
            }
        }
    }

}

function copyPacket (packet) {
    newPacket = {};
    for (var i = 0; i < packetFields.length; i++) {
        if(packet.hasOwnProperty(packetFields[i].layer)){
            newPacket[packetFields[i].layer] = {};
            for (var j = 0; j < packetFields[i].fields.length; j++) {
                if(packet[packetFields[i].layer].hasOwnProperty(packetFields[i].fields[j])){
                    newPacket[packetFields[i].layer][ packetFields[i].fields[j] ] = packet[packetFields[i].layer][ packetFields[i].fields[j] ];
                }
            }
        }
    }
    return newPacket;
}
