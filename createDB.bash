#!/bin/bash
sqlite3 /var/www-data/netsim.sqlite3 <<'END_SQL'
CREATE TABLE user (id integer PRIMARY KEY,name text,password text)
INSERT INTO user (name, password) VALUES ('erinn','$2y$10$n5ajLY.kMZVjLCNsUuPXFO70VUYLoolpQRGl3RCXOBVIaY4/peWXS')
CREATE TABLE category (id integer PRIMARY KEY,name text,orderby integer)
INSERT INTO category (name, orderby) VALUES('Basics', 1),('Spoofs', 2),('Denial of Service', 3),('Attacks', 4)
CREATE TABLE level (id integer PRIMARY KEY,category_id integer,name text,orderby integer,filename text)
INSERT INTO level (category_id, name, orderby, filename) VALUES(1, 'Getting started', 1, '01 Basics/level01'),(1, 'Packet fields', 2, '01 Basics/level02'),(1, 'Ping', 3, '01 Basics/level03'),(1, 'Routing', 4, '01 Basics/level04'),(1, 'Modems', 5, '01 Basics/level05'),(2, 'IP Spoofing', 1, '02 Spoofs/spoofs01'),(2, 'Stealing packets', 2, '02 Spoofs/spoofs02'),(3, 'Basic DoS', 1, '03 DoS/dos01'),(3, 'Distributed DoS', 2, '03 DoS/dos02'),(3, 'Smurf attack', 3, '03 DoS/dos03'),(4, 'Man-in-the-middle', 1, '04 Attacks/attacks01'),(4, 'Censorship', 2, '04 Attacks/attacks02'), (4, 'Traceroute', 3, '04 Attacks/attacks03')
CREATE TABLE solns (id integer PRIMARY KEY,user_id integer,level_id integer,completed integer,json text)
END_SQL
