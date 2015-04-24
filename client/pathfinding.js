//Renvoie la liste des pièces du plan
function getPieces(canvas) {
  var res = [];
  canvas.forEachObject(function(obj) {
    if(obj.userType == 'piece') {
      res.push(obj);
    }
  });
  return res;
}

//Renvoie la pièce où est contenu le point x,y, null s'il y en a pas
function getPieceFromPoint(canvas, x, y) {
  var res = null;
  var piecesList = getPieces(canvas);
  piecesList.forEach(function(piece) {
    if(piece.containsPoint(new fabric.Point(x, y))) {
      res = piece;
      return;
    }
  });
  return res;
}

//Renvoie la pièce la plus proche de la liste (où "traveled" est le plus bas)
function min(pieces) {
  var res = pieces[0];
  var min = pieces[0].traveled;
  pieces.forEach(function(n) {
    if(n.traveled < min) {
      res = n;
      min = n.traveled;
    }
  });
  return res;
}

//Distance entre deux pièces. On  ne prends pas en compte pour l'instant la taille des pièces
function dis(n1, n2) {
  return 1;
}

//Renvoie l'array en argument sans l'élément donné
function removeFromArray(array, elem) {
  var res = [];
  array.forEach(function (n) {
    if(elem != n)
      res.push(n);
  });
  return res;
}


//Renvoie une porte entre les deux pièces. Null s'il n'y a pas de porte
function getDoorBetweenPieces(n1, n2) {
  var res = null;
  n1.doors.forEach(function(door) {
    if(door.piece == n2) {
      res = door.rect;
      return;
    }
  });
  return res;
}

//Effectue une recherche de chemin en parcourant le graph en profondeur. Renvoie le chemin
function pathFindingDepth(canvas, pieceStart, pieceEnd) {
  //Au début aucune pièce n'est parcourue
  var pieces = getPieces(canvas);
  pieces.forEach(function(n) {
    n.traveled = false;
  });

  //Cette fonction récursive effectue la recherche à partir d'un point courant. On ajoute à chaque fois le point au chemin
  lookPiece = function(piece, pieceEnd, path) {
    //Si on est arrivé à la pièce finale, on renvoie le chemin
    if(piece == pieceEnd) return path;
    piece.traveled = true;
    //Pour chaque pièce voisine
    debugger;
    for(var i=0; i<piece.doors.length; i++) {
      door = piece.doors[i];
      //Si on est pas déjà passé par cette pièce
      if(!door.piece.traveled) {
        subPath = lookPiece(door.piece, pieceEnd, path.concat([door.piece])); //on cherche un chemin à partir de ce point
        if(subPath.length > 0) return subPath; //Si ce chemin n'est pas vide c'est qu'il est bon, on ne va pas plus loin
      }
    };
    //A partir de ce point il n'est pas possible d'arriver à la destination, on renvoie vide
    return [];
  }

  return lookPiece(pieceStart, pieceEnd, [pieceStart]);
}

//Recherche avec djikstra. Les pièces sont les noeuds.
function pathFindingDijkstra(canvas, pieceStart, pieceEnd) {
  var pieces = getPieces(canvas);
  //Au début toutes les pièces sont trop loin
  pieces.forEach(function(n) {
    n.traveled = Number.MAX_VALUE;
    n.previous = 0;
  });
  pieceStart.traveled = -1;
  notYetTraveled = pieces;
  //Pour chaque pièce pas encore calculée
  while(notYetTraveled.length > 0) {
    n1 = min(notYetTraveled); //On prend la pièce pas encore calculée la plus proche
    notYetTraveled = removeFromArray(notYetTraveled, n1);
    //On regarde la distance avec chacun de ses voisins
    n1.doors.forEach(function(door) {
      n2 = door.piece;
      //Si ce voisin est plus proche en passant par ce chemin, qu'avec un précédent calcul on le référence
      if(n2.traveled > n1.traveled + dis(n1, n2)) {
        n2.traveled = n1.traveled + dis(n1, n2);
        n2.previous = n1;
      }
    });
  }
  //Si on est pas arrivé à destination, on renvoie vide
  if(!pieceEnd.previous) return [];

  //On reconstruit le chemin
  path = [];
  n = pieceEnd;
  while(n != pieceStart) {
    path.push(n);
    n = n.previous;
  }
  path.push(pieceStart);
  return path.reverse();
}
