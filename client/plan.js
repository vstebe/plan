$(document).ready(function() {
    var PARAM_DOOR_WIDTH = 26;
    var PARAM_DOOR_HEIGHT = 12;
    var URL_BASE = "http://stebe.fr/plan/";


    var canvas = this.__canvas = new fabric.Canvas('canvas');

    var pairSelection = null;
    var editorState = 'pieces';

    var pointA = null;
    var pointB = null;

    fabric.Object.prototype.transparentCorners = false;

    //Crée une pièce de couleur aléatoire et l'ajoute à la scène
    addPiece = function() {
        getRandomColor = function() {
            return 100 + Math.floor(Math.random() * 156);
        };
        piece = new fabric.Rect({
            width: 100,
            height: 100,
            left: 350,
            top: 250,
            angle: 0,
            fill: 'rgba(' + getRandomColor() + ',' + getRandomColor() + ',' + getRandomColor() + ',0.8)',
            hasRotatingPoint: false,
            userType: 'piece',
            doors: []
        });
        canvas.add(piece);
        return piece;
    };

    //Supprime la/les pièces sélectionnées
    deletePiece = function() {
        obj = canvas.getActiveObject();
        group = canvas.getActiveGroup();

        if (obj && obj.userType == 'piece') {
            canvas.remove(obj);
        } else if (group) {
            group._objects.forEach(function(groupObj) {
                if (groupObj.userType == 'piece')
                    canvas.remove(groupObj);
            });
            canvas.discardActiveGroup().renderAll();
        }
    }

    //Supprime du plan la porte donnée en paramètre
    deleteDoor = function(door) {
        //Il faut supprimer le lien entre les pièces concernées
        canvas.forEachObject(function(piece) {
            if (piece.userType != 'piece') return;
            var newDoorsTab = [];


            piece.doors.forEach(function(cdoor) {
                if (cdoor.rect != door)
                    newDoorsTab.push(cdoor);
            });

            piece.doors = newDoorsTab;

        });
        canvas.remove(door);
    }

    //Supprime le/les portes sélectionnés
    deleteSelectedDoor = function() {
        obj = canvas.getActiveObject();
        group = canvas.getActiveGroup();

        if (obj && obj.userType == 'door') {
            deleteDoor(obj);
        } else if (group) {
            group._objects.forEach(function(groupObj) {
                if (groupObj.userType == 'door')
                    deleteDoor(groupObj);
            });
            canvas.discardActiveGroup().renderAll();
        }
    }

    //Créé un point sur la scène, avec la lettre donnée en paramètre affichée en dessous
    addPointObject = function(letter, initX, initY) {
        //La lettre
        var letterObj = new fabric.Text(letter, {
            shadow: 'rgba(0,0,0,0.3) 5px 5px 5px',
            hasControls: false,
            selectable: false
        });

        //Le point
        var circle = new fabric.Circle({
            left: initX,
            top: initY,
            strokeWidth: 5,
            radius: 12,
            fill: '#fff',
            stroke: '#666',
            hasControls: false,
            userLetter: letterObj
        });

        //Lorsque l'utilisateur bouge le point, la lettre doit suivre
        circle.on('moving', function() {
            letterObj.setTop(circle.getTop() + 20);
            letterObj.setLeft(circle.getLeft());
            letterObj.setCoords();

            //De plus, si un chemin est affiché, on le supprime
            removePath();
        });

        //Quand on supprime le point, on supprime la lettre
        circle.on('removed', function() {
            canvas.remove(letterObj);
        });
        canvas.add(letterObj);
        canvas.add(circle);

        letterObj.setTop(circle.getTop() + 20);
        letterObj.setLeft(circle.getLeft());
        letterObj.setCoords();

        letterObj.bringToFront();
        circle.bringToFront();

        return circle;
    }


    //Export
    save = function() {
        var res = new Object();
        res.pieces = [];
        res.doors = [];

        var i = 0;

        canvas.forEachObject(function(targ) {
            if (targ.userType == 'piece') {
                targ.id = i;
                res.pieces.push({
                    id: i,
                    left: targ.getLeft(),
                    top: targ.getTop(),
                    width: targ.getWidth(),
                    height: targ.getHeight(),
                });
                i++;
            }
        });

        doors = getDoors();
        doors.forEach(function(door) {
            res.doors.push({
                direction: door.doorDirection,
                left: door.getLeft(),
                top: door.getTop(),
                p1: door.p1.id,
                p2: door.p2.id
            });
        });

        $.ajax({
            type: "POST",
            url: URL_BASE + "/save.php",
            data: {
                'filename': window.prompt("Nom du plan :", ""),
                'data': JSON.stringify(res)
            }
        });
        
        refreshOpenList();
    }
    
    var lastElemSelected = null;

    //Charge un nouveau plan
    loadPlan = function() {
        var optionElem = $('#openSelect option:selected');
        if (optionElem.attr('id') == 'optionLabel') return; //Si c'est l'élément "charger un plan", on ne fait rien

        if(lastElemSelected == optionElem.html()) return; //Si c'est le même plan on ne fait rien
            
        lastElemSelected = optionElem.html();
                  
        if (!confirm('Voulez-vous charger le plan "' + optionElem.val() + '" ? Cela écrasera le plan actuel.')) return;


        $.getJSON(URL_BASE + "/open.php?filename=" + optionElem.val(), function(data) {
            canvas.clear();
            pairSelection = null;
            var piecesAssos = new Object();
            data.pieces.forEach(function(piece) {
                pieceObj = addPiece();
                pieceObj.setLeft(piece.left);
                pieceObj.setTop(piece.top);
                pieceObj.setHeight(piece.height);
                pieceObj.setWidth(piece.width);
                pieceObj.setCoords();
                piecesAssos[piece.id] = pieceObj;
            });
            canvas.renderAll();
            canvas.calcOffset();
            console.log(piecesAssos);
            data.doors.forEach(function(door) {
                doorObj = addDoor(piecesAssos[door.p1], piecesAssos[door.p2]);
                console.log(doorObj);
                doorObj.setLeft(door.left);
                doorObj.setTop(door.top);
            });

            canvas.renderAll();
            canvas.calcOffset();
            
            editorState = '';
            tabDoors();
            
            
        });
    }

    //Actualise la list des plans sur le serveur
    refreshOpenList = function() {
        $.getJSON(URL_BASE + "/list.php", function(data) {
            $('#openSelect').html('<option id="optionLabel">Charger un plan...</option>');;
            data.forEach(function(plan) {
                console.log(plan);
                $('#openSelect').append('<option>' + plan + '</option>');
            });
        });
    }

    refreshOpenList();


    getObjCenter = function(obj) {
        return {
            x: (obj.originX == 'center') ? obj.getLeft() : obj.getLeft() + obj.getWidth() / 2,
            y: (obj.originY == 'center') ? obj.getTop() : obj.getTop() + obj.getHeight() / 2
        }
    }

    //Calcule le chemin entre le point A et B et l'affiche
    $("#btnDistance").click(function() {

        removePath(); //On supprime éventuellement un chemin déjà affiché

        pieceStart = getPieceFromPoint(canvas, pointA.getLeft(), pointA.getTop());
        pieceEnd = getPieceFromPoint(canvas, pointB.getLeft(), pointB.getTop());

        if (!pieceStart || !pieceEnd) {
            alert("Les points sont mal placés.");
            return;
        }

        //Fabrique une ligne entre les centres des objets en paramètre
        makeLine = function(obj1, obj2) {
            obj1Center = getObjCenter(obj1);
            obj2Center = getObjCenter(obj2);
            return new fabric.Line([obj1Center.x, obj1Center.y, obj2Center.x, obj2Center.y], {
                fill: 'red',
                stroke: 'red',
                left: Math.min(obj1Center.x, obj2Center.x),
                top: Math.min(obj1Center.y, obj2Center.y),
                strokeWidth: 2,
                selectable: false,
                userType: 'pathElement'
            });
        }

        //Si A et B sont dans la même pièce on a rien besoin de faire, juste une ligne entre eux
        if (pieceStart == pieceEnd) {
            canvas.add(makeLine(pointA, pointB));
            return;
        }
        path = [];
        if ($("#boxDijPathfinding").is(':checked'))
            path = pathFindingDijkstra(canvas, pieceStart, pieceEnd);
        else
            path = pathFindingDepth(canvas, pieceStart, pieceEnd);

        console.log(path);


        if (path.length == 0) {
            alert("Aucun chemin n'a été trouvé.");
        } else { //On trace les lignes représentant les chemins, en passant par les portes
            canvas.add(makeLine(pointA, getDoorBetweenPieces(path[0], path[1])));
            for (i = 0; i < path.length - 2; i++) {
                canvas.add(makeLine(getDoorBetweenPieces(path[i], path[i + 1]), path[i + 1]));
                canvas.add(makeLine(path[i + 1], getDoorBetweenPieces(path[i + 1], path[i + 2])));
            }
            canvas.add(makeLine(getDoorBetweenPieces(path[path.length - 1], path[path.length - 2]), pointB));
        }



    });

    //Créé et affiche une porte entre les deux pièces sélectionnées
    addDoor = function(p1, p2) {
        console.log(p1);
        console.log(p2);
        if (p1.userType != 'piece') {
            //Si un couple de pièces est sélectionné
            if (pairSelection && pairSelection.length == 2) {
                p1 = pairSelection[0];
                p2 = pairSelection[1];

                console.log(pairSelection);

                //p1.getLeft() est relatif au groupe. On calcule les positions absolues
                absoluteLeftP1 = p1.getLeft() + p1.group.getLeft();
                absoluteLeftP2 = p2.getLeft() + p2.group.getLeft();
                absoluteTopP1 = p1.getTop() + p1.group.getTop();
                absoluteTopP2 = p2.getTop() + p2.group.getTop();
            } else {
                return;
            }
        } else {
            absoluteLeftP1 = p1.getLeft();
            absoluteLeftP2 = p2.getLeft();
            absoluteTopP1 = p1.getTop();
            absoluteTopP2 = p2.getTop();
        }



        detection = 4;

        rect = null;

        //Si les deux pièces sont collées et l'un en dessous de l'autre
        if (Math.abs(absoluteTopP1 - absoluteTopP2 - p2.getHeight()) < detection ||
            Math.abs(absoluteTopP2 - absoluteTopP1 - p1.getHeight()) < detection) {
            rtop = Math.max(absoluteTopP1, absoluteTopP2);
            m1 = Math.max(absoluteLeftP1, absoluteLeftP2);
            m2 = Math.min(absoluteLeftP1 + p1.getWidth(), absoluteLeftP2 + p2.getWidth());
            if (Math.abs(m1 - m2) < PARAM_DOOR_HEIGHT) return null; //pas assez de place
            rleft = (m1 + m2) / 2;
            console.log("1");
            rect = new fabric.Rect({
                width: PARAM_DOOR_WIDTH,
                height: PARAM_DOOR_HEIGHT,
                left: rleft,
                top: rtop,
                lastGoodPos: rleft,
                angle: 0,
                originX: 'center',
                originY: 'center',
                fill: 'rgb(0,0,0)',
                hasRotatingPoint: false,
                lockMovementY: true,
                hasControls: false,
                userType: 'door',
                doorDirection: 'Y',
                min: m1 + 2, //petite marge
                max: m2 - 2,
                p1: p1,
                p2: p2
            });
        } else if (Math.abs(absoluteLeftP1 - absoluteLeftP2 - p2.getWidth()) < detection ||
            Math.abs(absoluteLeftP2 - absoluteLeftP1 - p1.getWidth()) < detection) {
            console.log("2");
            //Si les deux pièces sont collées et l'un à droite de l'autre
            rleft = Math.max(absoluteLeftP1, absoluteLeftP2);
            m1 = Math.max(absoluteTopP1, absoluteTopP2);
            m2 = Math.min(absoluteTopP1 + p1.getHeight(), absoluteTopP2 + p2.getHeight());
            if (Math.abs(m1 - m2) < PARAM_DOOR_WIDTH) return null; //pas assez de place
            rtop = (m1 + m2) / 2;
            rect = new fabric.Rect({
                width: 12,
                height: 26,
                top: rtop,
                left: rleft,
                lastGoodPos: rtop,
                angle: 0,
                originX: 'center',
                originY: 'center',
                fill: 'rgb(0,0,0)',
                hasRotatingPoint: false,
                lockMovementX: true,
                hasControls: false,
                userType: 'door',
                doorDirection: 'X',
                min: m1 + 2,
                max: m2 - 2,
                p1: p1,
                p2: p2
            });
        }

        if (!rect) return;

        p1.doors.push({
            rect: rect,
            piece: p2
        });
        p2.doors.push({
            rect: rect,
            piece: p1
        });
        canvas.add(rect);
        rect.setCoords();
        rect.bringToFront();
        return rect;

    }


    //Renvoie un tableau contenant les portes affichées
    getDoors = function() {
        res = [];
        canvas.forEachObject(function(targ) {
            if (targ.userType == 'door')
                res.push(targ);
        });
        return res;
    };


    //Quand on passe en mode édition de pièces
    tabPlanMaking = function() {
        if (editorState == 'pieces') return;

        //Si un chemin est affiché, on le supprime
        removePath();

        //On vérifie s'il y a des portes, si oui on demande confirmation puis on les supprime
        doors = getDoors();
        if (doors.length == 0 || confirm("Revenir dans ce mode supprimera les portes. Continuer ?")) {
            doors.forEach(function(door) {
                deleteDoor(door);
            });

            //On permet à l'utilisateur de pouvoir déplacer les pièces
            canvas.forEachObject(function(targ) {
                targ.hasControls = true;
                targ.lockMovementX = false;
                targ.lockMovementY = false;
                targ.lockScalingX = false;
                targ.lockScalingY = false;
            });
            editorState = 'pieces';

            if (pointA) canvas.remove(pointA);
            if (pointB) canvas.remove(pointB);

            //Changement de l'état des onglets
            $(".nav-tabs li").removeClass("active");
            $("#tabPlanMaking").addClass("active");
            $(".tabContent").hide();
            $("#tabPlanMakingContent").show();
        }


    }

    //Quand on passe en mode édition de portes
    tabDoors = function() {
        if (editorState == 'doors') return;

        //Si un chemin est affiché, on le supprime
        removePath();

        //On bouge un peu les pièces, de façon à ce que si deux pièces sont quasiment collées (2pixels d'écart au plus), on les colles
        canvas.forEachObject(function(targ) {
            if (targ.userType == 'piece')
                adapt(targ, 2);
        });

        //On ne doit pas pouvoir bouger les pièces, et les portes uniquement sur leur axe.
        canvas.forEachObject(function(targ) {
            targ.hasControls = false;
            targ.lockMovementX = false;
            targ.lockMovementY = false;

            targ.lockScalingX = true;
            targ.lockScalingY = true;
            if (targ.userType == 'piece' || (targ.userType == 'door' && targ.doorDirection == 'X'))
                targ.lockMovementX = true;
            if (targ.userType == 'piece' || (targ.userType == 'door' && targ.doorDirection == 'Y'))
                targ.lockMovementY = true;
        });

        //Etat des onglets
        $(".nav-tabs li").removeClass("active");
        $("#tabDoors").addClass("active");
        $(".tabContent").hide();
        $("#tabDoorsContent").show();

        //On supprime les points s'ils existent
        if (pointA) canvas.remove(pointA);
        if (pointB) canvas.remove(pointB);

        editorState = 'doors';
    }

    //Quand on passe en mode édition distance
    tabDistance = function() {
        if (editorState == 'distance') return;

        //On ne doit pas pouvoir bouger ni les pièces ni les portes
        canvas.forEachObject(function(targ) {
            targ.hasControls = false;
            targ.lockMovementX = true;
            targ.lockMovementY = true;
        });

        //Etat des onglets
        $(".nav-tabs li").removeClass("active");
        $("#tabDistance").addClass("active");
        $(".tabContent").hide();
        $("#tabDistanceContent").show();

        //On créé les points A et B et on les affiche
        pointA = addPointObject('A', 100, 50);
        pointB = addPointObject('B', 200, 50);

        editorState = 'distance';
    }


    //On bind les boutons aux fonctions
    $("#btnAddPiece").click(addPiece);
    $("#btnDeletePiece").click(deletePiece);
    $("#btnAddDoor").click(addDoor);
    $("#btnDeleteDoor").click(deleteSelectedDoor);
    $("#btnSave").click(save);
    $("#openSelect").click(loadPlan);
    $("#btnRefreshList").click(refreshOpenList);
    $("#tabPlanMaking").click(tabPlanMaking);
    $("#tabDoors").click(tabDoors);
    $("#tabDistance").click(tabDistance);

    //Une pièce de départ
    addPiece();

    //Supprime un chemin affiché s'il existe
    removePath = function() {
        canvas.forEachObject(function(targ) {
            if (targ.userType == 'pathElement') canvas.remove(targ);
        });
    }

    //Adapte légarèement une pièce, pour qu'elle se colle à une autre pièce proche
    function adapt(activeObject, edgedetection) {
        activeObject.left = Math.round(activeObject.left);
        activeObject.top = Math.round(activeObject.top);
        activeObject.width = Math.round(activeObject.width);
        activeObject.height = Math.round(activeObject.height);

        canvas.forEachObject(function(targ) {


            if (targ === activeObject) return;
            if (targ.userType != 'piece') return;

            if (Math.abs(activeObject.oCoords.tr.x - targ.oCoords.tl.x) < edgedetection) {
                activeObject.left = targ.left - activeObject.currentWidth;
            }
            if (Math.abs(activeObject.oCoords.tl.x - targ.oCoords.tr.x) < edgedetection) {
                activeObject.left = targ.left + targ.currentWidth;
            }
            if (Math.abs(activeObject.oCoords.br.y - targ.oCoords.tr.y) < edgedetection) {
                activeObject.top = targ.top - activeObject.currentHeight;
            }
            if (Math.abs(targ.oCoords.br.y - activeObject.oCoords.tr.y) < edgedetection) {
                activeObject.top = targ.top + targ.currentHeight;
            }
        });
    }

    //Quand on bouge quelque chose
    canvas.on('object:moving', function(e) {
        var obj = e.target;


        if (obj._objects) return;

        //Si on bouge une pièce
        //On adapte en temps réel un objet qui est déplacé, pour qu'il se colle aux autres
        if (editorState == 'pieces' && obj.userType == 'piece') {
            obj.setCoords(); //Sets corner position coordinates based on current angle, width and height
            adapt(obj, 20);

            //Si c'est une porte, on doit empécher d'aller trop loin
        } else if (editorState == 'doors' && obj.userType == 'door') {
            if (obj.lockMovementY) {
                leftBorder = obj.getLeft() - obj.getWidth() / 2;
                rightBorder = obj.getLeft() + obj.getWidth() / 2;
                //Si on a dépassé la limite, on force la position sur la dernière bonne pos
                if (leftBorder < obj.min || rightBorder > obj.max)
                    obj.setLeft(obj.lastGoodPos);
                else
                    obj.lastGoodPos = obj.getLeft();
            } else if (obj.lockMovementX) {
                topBorder = obj.getTop() - obj.getHeight() / 2;
                bottomBorder = obj.getTop() + obj.getHeight() / 2;
                //Si on a dépassé la limite, on force la position sur la dernière bonne pos
                if (topBorder < obj.min || bottomBorder > obj.max)
                    obj.setTop(obj.lastGoodPos);
                else
                    obj.lastGoodPos = obj.getTop();
            }
        }
    });




    //Lorsqu'une sélection est faite, s'il s'agit de deux pièces on les enregistre
    canvas.on('selection:created', function(e) {
        console.log(e.target._objects);
        pairSelectionLocal = new Array();
        e.target._objects.forEach(function(obj) {
            if (obj.userType == "piece")
                pairSelectionLocal.push(obj);
            if (pairSelectionLocal.length == 2) return;
        });

        if (pairSelectionLocal.length == 2) pairSelection = pairSelectionLocal;
    });

    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        canvas.setHeight(500);
        canvas.setWidth(Math.round(window.innerWidth * 0.8));
        canvas.renderAll();
    }

    // resize on init
    resizeCanvas();



});