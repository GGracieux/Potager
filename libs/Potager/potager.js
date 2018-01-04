// -----------------------------------------------
// TODO
// -----------------------------------------------	
// copier / coller
// déplacement de groupe
// Zoom molette
// debug Zones

// -----------------------------------------------
// INITIALISATION DATA
// -----------------------------------------------	

// types d'affinites
var typeAff = [];
typeAff[0] = 'Mauvais';
typeAff[1] = 'Neutre';
typeAff[2] = 'Bon';
typeAff[3] = 'Tres bon';

// echelle de couleur
var echelleCouleur = [];
echelleCouleur[-1] = '#c12e2e';
echelleCouleur[0] = '#9DB290';
echelleCouleur[1] = '#91AE7E';
echelleCouleur[2] = '#85AB6C';
echelleCouleur[3] = '#79A85B';
echelleCouleur[4] = '#6EA549';
echelleCouleur[5] = '#62A237';
echelleCouleur[6] = '#569F26';
echelleCouleur[7] = '#4A9C14';
echelleCouleur[8] = '#3F9903';

// -----------------------------------------------
// INITIALISATION OBJETS
// -----------------------------------------------	

// Canvas de dessin
var canvas;

// Plante sujette à l'action en cours
var curr_plante;

// Liste des plantes 
var plantes = [];	

// Liste des segments 
var segments = [];

// Action en cours
var reloading = false;

// Calques
var layerFond;
var layerSegments;
var layerZones; 
var layerSegmentsPhy;
var layerPhysique;
var layerTexte;	

// -----------------------------------------------
// INSTANCIATION
// -----------------------------------------------
paper.install(window);
window.onload = function() {
	
	// Initialise le selecteur pour ajout legumes
	initialiserSelecteurLegumes();

	// Création du projet sur le canvas
	canvas = document.getElementById('canvas');
	paper.setup(canvas);
	paper.view.draw();
		
	// Calques
	layerFond = new Layer();
	layerSegments = new Layer();
	layerZones = new Layer(); 
	layerSegmentsPhy = new Layer();
	layerPhysique = new Layer();
	layerTexte = new Layer();	

    // Dessine le potager
    layerFond.activate();
    var rectPotager = new Rectangle({
    	x:100, 
    	y:100, 
    	width:PhysicalUnitToPaper(500), 
    	height:PhysicalUnitToPaper(630)
    });
	var path = new Path.Rectangle({
		rectangle : rectPotager,
		fillColor: '#917a61',
		strokeColor: 'black'
	});

	// Initialisation des calques
	layerPhysique.activate();
	layerZones.visible = false;
	
	initializeIHM();
	
}


// -----------------------------------------------
// GETTERS SUR LES DONNEES
// -----------------------------------------------	

function getAffinites(typePlanteA, typePlanteB) 
{
	var aff = affinites[typePlanteA][typePlanteB];
	if (typeof aff != 'undefined') {
		return aff;
	}
	return 1;
}

function getZoneAction(typePlanteId)
{
	var marge = zoneAction[typePlanteId];
	if (typeof marge != 'undefined') {
		return marge;
	}
	return 20;	
}


// -----------------------------------------------
// GETTERS DU LANCEMENT DU RECALCUL SEGMENTS
// -----------------------------------------------	

// Stoquage de l'info : besoin de recalculer les segments
var calcSegments = true;

/**
* Flag les segments a recalculer
*/
function setCalculerSegments()
{
	calcSegments = true;
}

/**
* Gestion des déclencheurs du calcul segement
* Pour ne lancer le calcul que si nécessaire
*/
function doCalculerSegments(callback = null) {		
	
	// En mode visible 
	if (segmentsVisibles()) {
		
		// Si besoin de rafraichir
		if (calcSegments == true) {
			
			// Affiche le loader
			showProgress();	
	
			setTimeout(function(){ 
				calculerSegments();			
				if (callback !== null) callback();
				hideProgress();					
			}, 100);	
	
			calcSegments = false;
		} else {
			if (callback !== null) callback();
		}
	} else {
		if (callback !== null) callback();
	}
	
}

/**
* Test la visibilité des segments
*/
function segmentsVisibles () {
	return !isVuePhysique();
}

// -----------------------------------------------
// FABRICATION DES PLANTES
// -----------------------------------------------

function creerPlante(typePlanteId, rect, forme) {
	
	// Détermine le type de plante et la marge de sa zone d'action
	var margeZoneAction = PhysicalUnitToPaper(getZoneAction(typePlanteId));
	var typePlante = plantesType[typePlanteId];	
	
	// Détermine les zones physiques, action et titre
	var pathPhy = creerZonePhysique(rect, forme);
	var pathZone = creerZoneEffet(pathPhy, margeZoneAction, forme);
	var pathTitre = creerTexteTitre(typePlante, pathPhy.bounds.center);
	
	return {
		
		// Type d'une plante
		typePlanteId : typePlanteId,
		typePlante : typePlante,
		
		// Formes paperJs
		pathPhy:pathPhy,
		pathZone:pathZone,		
		pathTitre:pathTitre,
		segmentsInfluence:[],
		forme:forme,		
		
		// Set la taille du text
		setTailleTexte: function (taille) {	
			this.pathTitre.fontSize = taille;
			this.pathTitre.position = this.pathPhy.bounds.center;
		},
		setTexteVisible: function(visible) {
			this.pathTitre.visible = visible;
		},
		
		// Affiche les infos d'une plante
		getInfos: function () {
			var infos = '<h4>' + this.typePlante + '</h4>';
			infos +=  'Dimensions : ' + paperUnitToPhysical(this.pathPhy.bounds.width);
			infos += ' x ' + paperUnitToPhysical(this.pathPhy.bounds.height) + ' cm<br/>';	
			infos += 'Surface : ' + this.getSurface() + ' mc';
			return infos;
		},
		
		// Calcul la surface
		getSurface: function () {
			var widthPhy = paperUnitToPhysical(this.pathPhy.bounds.width);
			var heightPhy = paperUnitToPhysical(this.pathPhy.bounds.height);
			if (this.forme == 'ellipse') {
				return ((3.1415926535898 * (widthPhy/2) * (heightPhy/2)) / 10000).toFixed(2);
			} else if (forme == 'rectangle'){
				return ((widthPhy * heightPhy) / 10000).toFixed(2);
			}
		},
		
		// Supprime la plante de la liste de plante
		remove: function () {
			supprimerPlante(getIndexOfPlante(this.pathPhy.id));
		},
		
		// Déplace la plante
		move: function (delta) {
			this.pathPhy.position = new Point(
				pathPhy.position.x + delta.x, 
				pathPhy.position.y + delta.y
			);	
			this.pathZone.position = this.pathPhy.position;
			this.pathTitre.position = this.pathPhy.bounds.center;
		},	
		
		// Redimentionne la plante
		resize: function (event) {
					
			// Calcul le ratio X
			var oldWidth = this.pathPhy.bounds.width / 2;
			var newWidth = oldWidth + event.delta.x;;
			var scaleX = newWidth / oldWidth;

			// Calcul le ratio Y
			var oldHeight = this.pathPhy.bounds.height / 2;
			var newHeight = oldHeight + event.delta.y;
			var scaleY = newHeight / oldHeight;

			// Applique le ratio et recalcul la zone d'effet
			this.pathPhy.scale(scaleX,scaleY);
			this.pathZone.remove();
			this.pathZone = creerZoneEffet(this.pathPhy, PhysicalUnitToPaper(getZoneAction(this.typePlanteId)), this.forme);					
		}
	}	
}


/**
* Création zone effet
*/
function creerZoneEffet(zonePhysique, marge, forme)
{
	// Calcul du rectangle
	var newTopLeft = new Point(
		zonePhysique.bounds.x - marge,
		zonePhysique.bounds.y - marge
	);
	var newBottomRight = new Point(
		newTopLeft.x + zonePhysique.bounds.width + marge * 2,
		newTopLeft.y + zonePhysique.bounds.height + marge * 2
	);
	var rect = new Rectangle(newTopLeft,newBottomRight);

	// Activation du calque Zone
	layerZones.activate();

	var path;
	if (forme == 'ellipse') {
		path =  new Path.Ellipse({
			rectangle : rect,
			strokeColor: '#c4a17f',
			dashArray: [10, 12]
		});
	} else if (forme == 'rectangle') {
		path = new Path.Rectangle({
			rectangle : rect,
			strokeColor: '#c4a17f',
			dashArray: [10, 12]
		});
	}
	if (!reloading) path.removeOnDrag();	

	// Retourne le résultat
	return path;
}


/**
* Création zone physique carré ou rond
*/
function creerZonePhysique(rect, forme)
{	

	// Activation du calque  physique
	layerPhysique.activate();

	// Calcul de la forme
	var path;
	if (forme == 'ellipse') {
		path =  new Path.Ellipse({
			rectangle : rect,
			fillColor: '#c4c4c4',
			strokeColor: 'black'
		});
	} else if (forme == 'rectangle') {
		path = new Path.Rectangle({
			rectangle : rect,
			fillColor: '#c4c4c4',
			strokeColor: 'black'
		});
	}
	if (!reloading) path.removeOnDrag();	

	// Retourne le résultat
	return path;
}


/**
* Création le titre
*/
function creerTexteTitre(texte, pointCenter)
{
	layerTexte.activate();
	var text = new PointText(pointCenter);
	text.content = texte;
	text.style = {
		fontFamily: 'Tahoma',
		fontSize: tailleTexte,
		fillColor: '#426296',
		justification: 'center'
	}
	text.position = pointCenter;
	if (!reloading) text.removeOnDrag();
	return text;
}

// -----------------------------------------------
// MESURES MONDE PHYSIQUE
// -----------------------------------------------

/**
* Convertion unité ecran => cm
*/
function paperUnitToPhysical(value) {
	return Math.round(value /4);
}

/**
* Convertion unité ecran => cm
*/
function PhysicalUnitToPaper(value) {
	return Math.round(value * 4);
}

/**
* Obtiens la taille d'une forme
*/
function getPathSize(path, forme) {
	var infos = '';
	if (forme == 'ellipse') {
		infos += 'Diametre : ' + paperUnitToPhysical(path.bounds.width) + ' cm';
	} else if (forme == 'rectangle'){
		infos +=  'Dimensions : ' + paperUnitToPhysical(path.bounds.width);
		infos += ' x ' + paperUnitToPhysical(path.bounds.height) + ' cm';
	}
	return infos;
}

// -----------------------------------------------
// GESTION DE LA LISTE DES PLANTES
// -----------------------------------------------

/**
* Ajoute une plante a la liste
*/
function ajouterPlante(plante) {
	plantes[plantes.length] = plante;
}
 
/**
* Cherche une plante dans la liste
*/
function getPlante(pathId) {
	var idxPlante = getIndexOfPlante(pathId);
	if (idxPlante !== null)
		return plantes[getIndexOfPlante(pathId)];
	return null;			
}

/**
* Obtiens l'index d'une plante dans la liste a partir de l'id de son path
*/
function getIndexOfPlante(pathId) {
	var arrayLength = plantes.length;
	for (var i = 0; i < arrayLength; i++) {
		if (plantes[i].pathPhy.id == pathId) return i;		
		if (plantes[i].pathTitre.id == pathId) return i;				
	}
	return null;
}

/**
* Supprime une plante a partir de son index
*/
function supprimerPlante(index) {
	plantes[index].pathPhy.remove();
	plantes[index].pathZone.remove();
	plantes[index].pathTitre.remove();
	for (var i = 0; i < plantes[index].segmentsInfluence.length; i++) {
		plantes[index].segmentsInfluence[i].path.remove();					
	}
	plantes.splice(index, 1);	
}


// -----------------------------------------------
// CALCUL DES INTERSECTIONS
// -----------------------------------------------

function calculerSegmentsPlantes() {
	viderSegmentsPhy();
	for (var i = 0; i < plantes.length; i++) {
		for (var j = 0; j < segments.length; j++) {
			
			if (Overlapse(plantes[i].pathPhy,segments[j].path)) {
			
				var nouveauSegment = CreerSegment(
					plantes[i].pathPhy.intersect(segments[j].path),
					segments[j].influences
					);
				if (!nouveauSegment.path.isEmpty()) { 	
					layerSegmentsPhy.addChild(nouveauSegment.path);
					nouveauSegment.setPlante(i)
					plantes[i].segmentsInfluence.push(nouveauSegment);
				}		
			}
		}		
	}
}

function viderSegmentsPhy() {
	for (var i = 0; i < plantes.length; i++) {
		for (var j = 0; j < plantes[i].segmentsInfluence.length ; j++) {
			plantes[i].segmentsInfluence[j].path.remove();
		}
		plantes[i].segmentsInfluence = [];
	}
}

function calculerSegments() {

	viderSegments();
	layerSegments.activate();

	// Initialisation du tableau de segments
	var seg = [];
	var map = [];
	var arrayLength = plantes.length;
	for (var i = 0; i < arrayLength; i++) {

		// détermine le type de la plante
		var planteTypeId = plantes[i].typePlanteId;

		// Si l'index pour ce type de plante existe déja
		if (typeof map[planteTypeId] != 'undefined') {

			// union des path
			var nouveauSegment = seg[map[planteTypeId]].path.unite(plantes[i].pathZone);
			seg[map[planteTypeId]].path.remove();
			seg[map[planteTypeId]].path = nouveauSegment;

		} else {

			// enregistre l'index pour ce type de plante
			map[planteTypeId] = seg.length;

			// Crée le segment pour ce type de plante
			seg[seg.length] = CreerSegment(plantes[i].pathZone.clone(),[plantes[i].typePlanteId]);
			layerSegments.addChild(seg[seg.length-1].path);
		}
	}

	// Parcours du tableau des segments
	for (var i = 0; i <= seg.length - 2; i++) {

		// Parcours de tous les autres segments existants au debut de la boucle i
		var arrayLength = seg.length;
		for (var j = i+1; j <= (arrayLength - 1); j++) {		

			if (Overlapse(seg[i].path,seg[j].path)) {		
			
				var nouveauSegment = CreerSegment(
					seg[i].path.intersect(seg[j].path),
					seg[i].influences.slice(0).concat(seg[j].influences.slice(0)) 
					);

				if (nouveauSegment.path !== null) {
					if (!nouveauSegment.path.isEmpty()) { 				
						nouveauI = seg[i].path.subtract(nouveauSegment.path);
						nouveauJ = seg[j].path.subtract(nouveauSegment.path);
						seg[i].path.remove();
						seg[j].path.remove();
						seg[i].path = nouveauI;
						seg[j].path = nouveauJ;
						seg[seg.length] = nouveauSegment;					
					}
				}
			}
		}
	}
	segments = seg;	
	calculerSegmentsPlantes();	
	unselectAll();
	layerPhysique.activate();	
}

function Overlapse(pathA, pathB) {

	// Si path A en dessous de B
	if ((pathA.bounds.y + pathA.bounds.height) < pathB.bounds.y) return false;
	
	// Si path B est en dessousde  A
	if ((pathB.bounds.y + pathB.bounds.height) < pathA.bounds.y) return false;
	
	// Si path A est a gauche de path B
	if ((pathA.bounds.x + pathA.bounds.width) < pathB.bounds.x) return false;
	
	// Si path B est a gauche de path A
	if ((pathB.bounds.x + pathB.bounds.width) < pathA.bounds.x) return false;

	return true;
}

function formatMs(val){
	return val / 1000;
}

function viderSegments() {
	var arrayLength = segments.length;
	for (var i = 0; i < arrayLength; i++) {
		segments[i].path.remove();
	}
	segments = [];
}

/**
* Création d'un segment
* path : forme du segment
* influence : tableau des id de type de plante qui influencent ce segment
*/
function CreerSegment(path, influences) {

	var seg = {
		path : path,
		influences : influences,
		idPlante : null,
		score : null,	
		
		modeTestAffinite : false,	
		typePlanteTestAffinite : null,

		modeTestInfluence : false,	
		typePlanteTestInfluence: null,
		backupInfluences : [],
		socoreTestInfluence : null,
		
		isPlanteSegment() {
			return !(this.idPlante === null);
		},
		getTypePlanteId() {
			if (this.modeTestAffinite) {				
				return this.typePlanteTestAffinite;
			} else {				
				return plantes[this.idPlante].typePlanteId;
			}		
		},
		calculerScore : function () {		
			var typePlanteId = this.getTypePlanteId();
			this.score = 0;	
			for (var i = 0; i < this.influences.length; i++) {
				var affinite = getAffinites(typePlanteId, this.influences[i]);
				if (affinite == 0) {
					this.score = -1;
					return;
				} else {
					this.score += (affinite - 1);
				}
			}					
		},
		getInfos: function () {
			
			var infos = '';
			
			// Ajoute les infos de la plante			
			var isSegmentPlante = this.isPlanteSegment();
			if (this.modeTestAffinite) {
				infos += '<h4>' + plantesType[this.typePlanteTestAffinite] + ' - Test affinite (' + this.score + ')</h4>';						
			} else if (this.modeTestInfluence) {
				infos += '<h4>' + plantesType[this.typePlanteTestInfluence] + ' - Test influence';	
				infos += ' (' + getSigne(this.socoreTestInfluence) + this.socoreTestInfluence + ') </h4>';
			} else if (isSegmentPlante) {
				infos += plantes[this.idPlante].getInfos();
				infos += '<br/><br/>';
			}
			
			// Ajoute les infos d'influences
			var nbInfluences = 0;
			infos += '<b>Influences</b><br/>';
			if (isSegmentPlante || this.modeTestAffinite) {
				var typePlanteId = this.getTypePlanteId();
				if (this.modeTestInfluence) {					
					infos += '- ' + plantesType[plantes[this.idPlante].typePlanteId];
					var aff = getAffinites(typePlanteId, plantesType[plantes[this.idPlante].typePlanteId]);
					infos += ' : ' + typeAff[aff] + ' (' + (aff-1) + ')';
					infos += '<br/>';					
					nbInfluences ++;
				}								
				for (var i = 0; i < this.influences.length; i++) {
					if (this.influences[i] != typePlanteId) {										// TODO virer ce segment
						infos += '- ' + plantesType[this.influences[i]];
						var aff = getAffinites(typePlanteId, this.influences[i]);
						infos += ' : ' + typeAff[aff] + ' (' + (aff-1) + ')';
						infos += '<br/>';
						nbInfluences ++;
					}
				}
				if (nbInfluences == 0) infos += 'Aucune<br/>';
				infos += '<br/>';						
				infos += '<b>Indice de bien etre : ' + this.score + '</b>';
				if (this.modeTestInfluence) {
					var newScore;
					if ((this.socoreTestInfluence == -1 ) || (this.score == -1)) {
						newScore = -1;
					} else {
						newScore = this.score + this.socoreTestInfluence;
					}
					infos += '<br/><b>Nouvel Indice de bien etre : ' + newScore + '</b>'
				}

			} else {
				for (var i = 0; i < this.influences.length; i++) {
					if (this.influences[i] != typePlanteId) {										// TODO virer ce segment
						infos += '- ' + plantesType[this.influences[i]];
						infos += '<br/>';
						nbInfluences ++;
					}
				}
				if (nbInfluences == 0) infos += 'Aucune<br/>';
			}

			
			return infos;
		},
		setColor : function () {
			if (this.path) {
				if (this.isPlanteSegment() || this.modeTestAffinite || this.modeTestInfluence) {

					var idx;
					if (this.modeTestInfluence) {
						idx = Math.min(echelleCouleur.length - 1, this.socoreTestInfluence);
					} else {
						idx = Math.min(echelleCouleur.length - 1, this.score);
					}
					var color = echelleCouleur[idx];
					this.path.strokeColor = 'white';
					this.path.fillColor = color;
				} else {
					this.path.strokeColor = '#c4a17f';
					this.path.fillColor = null;						
				}
			}
		},
		setPlante(idPlante) {
			this.idPlante = idPlante;
			this.update();
		},
		enableModeTestAffinite(typePlanteId) {
			this.modeTestAffinite = true;
			this.typePlanteTestAffinite = typePlanteId;
			this.update();			
		},
		disableModeTestAffinite() {
			this.typePlanteTestAffinite = null;
			this.score = null;
			this.path.fillColor = null;		
			this.modeTestAffinite = false;		
		},
		enableModeTestInfluence(typePlanteId) {
			this.modeTestInfluence = true;
			this.typePlanteTestInfluence = typePlanteId;
			this.backupInfluences = this.influences;
			if (this.influences.includes(typePlanteId)) {
				this.socoreTestInfluence = 0;
			} else {
				this.socoreTestInfluence = getAffinites(plantes[this.idPlante].typePlanteId,typePlanteId) - 1;
			}
			this.setColor();

		},
		disableModeTestInfluence() {
			this.modeTestInfluence = false;
			this.backupInfluences = this.influences;
			this.update();
		},
		removePlante() {
			this.idPlante = null;
			this.update();			
		},
		update() {
			this.calculerScore();
			this.setColor();
		}
	};

	return seg;
}

function getSigne(val) {
	if (val > 0) return '+';
	return '';
}

// --------------------------


function changeSelectedPlante() {
	if (testAffinite) refreshModeAffinite(true);
	if (testInfluence) refreshModeInfluence(true);
}

// Cherche une plante dans la liste
function getSegment(pathId) {
	var idxSegment = getIndexOfSegment(pathId);
	if (idxSegment !== null)
		return segments[getIndexOfSegment(pathId)];
	return null;			
}

function getIndexOfSegment(pathId) {
	var arrayLength = segments.length;
	for (var i = 0; i < arrayLength; i++) {
		if (segments[i].path.id == pathId)
			return i;					
	}
	return null;
}

function getSegmentPhy(pathId) {
	var idxSegmentPhy = getIndexOfSegmentPhy(pathId);
	if (idxSegmentPhy !== null)
		return plantes[idxSegmentPhy[0]].segmentsInfluence[idxSegmentPhy[1]]
	return null;			
}

function getIndexOfSegmentPhy(pathId) {
		
	for (var i = 0; i < plantes.length; i++) {		
		for (var j = 0; j < plantes[i].segmentsInfluence.length; j++) {
			if (plantes[i].segmentsInfluence[j].path.id == pathId) 
				return [i,j];
		}
	}
	return null;
}

// -----------------------------------------------
// AFFICHAGE
// -----------------------------------------------

function getListePlantesHTML(itemId) {
	var contenu = '';
	var boldStart = '';
	var boldEnd = '';
	var arrayLength = plantes.length;
	for (var i = 0; i < arrayLength; i++) {

		if (itemId == plantes[i].pathPhy.id) {
			boldStart = '<b>';
			boldEnd = '</b>';
		} else {
			boldStart = '';
			boldEnd = '';
		}
		
		contenu += ('<br/>' + boldStart + plantes[i].pathPhy.id + ' -> ' + plantes[i].typePlante + boldEnd);		
	}
	return contenu;
}


function getListeSegments() {
	// liste des segments
	var contenu = '<br/><br/>' + segments.length + ' segments : ';

	var arrayLength = segments.length;
	for (var i = 0; i < arrayLength; i++) {
		contenu += segments[i].path.id + '(' + segments[i].path.length + '), ';
		segments[i].fillColor = getRandomColor();
	}
	return contenu;
}

// -----------------------------------------------
// SAUVEGARDE RESTORATION
// -----------------------------------------------

/**
* Sauvegarde le potager
*/
function savePlantes() {

    var textToSave = serializeData();
    var textToSaveAsBlob = new Blob([textToSave], {type:"text/plain"});
    var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
    var fileNameToSaveAs = getOutputFileName();
 
    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    downloadLink.href = textToSaveAsURL;
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
 
    downloadLink.click();

}

/**
* Serialise en json les données du potager
*/
function serializeData()
{
	// données utiles au rechargement
	var data = [];
	for (var i = 0; i < plantes.length; i++) {
		data[i] = {
			typePlanteId : plantes[i].typePlanteId,
			forme : plantes[i].forme,
			x : plantes[i].pathPhy.bounds.x,
			y : plantes[i].pathPhy.bounds.y,
			width : plantes[i].pathPhy.bounds.width,
			height : plantes[i].pathPhy.bounds.height
		};
	}
	
	// Vue
	var view = { 
		centerX: paper.view.center.x,
		centerY: paper.view.center.y,
		zoom : paper.view.zoom,
	};
	
	// Synthèse
	var arr = {
		version : 3,
		tailleTexte : tailleTexte,
		donnees : data,
		view : view,
	}

	return JSON.stringify(arr);
}

/**
* Compose le nom du fichier de sauvegarde
*/
function getOutputFileName() 
{
	var currentdate = new Date();
	var fileName = 'potager';
	fileName += '-' + currentdate.getFullYear();
	fileName += '-' + (currentdate.getMonth()+1);
	fileName += '-' + currentdate.getDate();
	fileName += '_(' + currentdate.getHours();
	fileName += '-' + currentdate.getMinutes();
	fileName += '-' + currentdate.getSeconds();
	fileName += ').json';
	return fileName;
}

/**
* Nettoyage du hook de telechargement
*/
function destroyClickedElement(event)
{
    document.body.removeChild(event.target);
}
 
/**
* Charge le potager
*/ 
function loadPlantes()
{		
	reinitData();

	var item = document.getElementById("charger");
    var fileToLoad = item.files[0];
 
    var fileReader = new FileReader();
    fileReader.onload = function(fileLoadedEvent) 
    {
    	reloading = true;
        var textFromFileLoaded = fileLoadedEvent.target.result;
        var arr = JSON.parse(textFromFileLoaded);
		
        if (arr.version <= 3) {		

			if (arr.tailleTexte) {
				tailleTexte = arr.tailleTexte;		
			}
			
			if (arr.view) {
				paper.view.zoom = arr.view.zoom;
				paper.view.center = new Point(arr.view.centerX,arr.view.centerY);				
			}			
		
        	for (var i = 0; i < arr.donnees.length; i++) {
        		ajouterPlante(creerPlante(
        			arr.donnees[i].typePlanteId, 
        			new Rectangle({
        				x : arr.donnees[i].x,
        				y : arr.donnees[i].y,
        				width : arr.donnees[i].width,
        				height : arr.donnees[i].height,
        			}),
        			arr.donnees[i].forme)
        		);
        	}			
			setCalculerSegments();
			doCalculerSegments();		
        } else {
        	alert('Format de sauvegarde inconnue');
        }
        reloading = false;

    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function reinitData(){
	
	// Suppression des plantes
	for (var i = 0; i < plantes.length; i++) {
		supprimerPlante(i);
	}
	plantes = [];
	
	// Plante sujette à l'action en cours
	curr_plante = null;

	// Suppression des segments 
	for (var i = 0; i < segments.length; i++) {
		if (typeof segments[i].path != 'undefined') {
			segments[i].path.remove();
		}
	}	
	segments = [];	
}


// -----------------------------------------------
// GESTION DE LA TAILLE DU TEXTE
// -----------------------------------------------

// taille Actuelle du texte
var tailleTexte = 16;

// taille en dessous de laquelle le texte disparait
var tailleTexteMin = 6;

// taille Max du texte
var tailleTexteMax = 50;

/**
* Augmente la taille du texte
*/
function upSizeText()
{
	if (tailleTexte < tailleTexteMax ) 
	{
		tailleTexte ++;
		for (var i = 0; i < plantes.length; i++) {	
			plantes[i].setTailleTexte(tailleTexte);
			plantes[i].setTexteVisible(true);
		}		
	}
}

/**
* Diminue la taille du texte
*/
function downSizeText()
{
	if (tailleTexte > tailleTexteMin) 
	{	
		tailleTexte --;
		for (var i = 0; i < plantes.length; i++) {	
			plantes[i].setTailleTexte(tailleTexte);
		}
	} else {
		tailleTexte = (tailleTexteMin - 1);
		for (var i = 0; i < plantes.length; i++) {	
			plantes[i].setTexteVisible(false);
		}		
	}
}

// -----------------------------------------------
// GESTION DU CHANGEMENT DE MODE DE VUE
// -----------------------------------------------

// mode test affinité enclenché ?
var testAffinite = false;

// mode test d'influence enclenché ?
var testInfluence = false;

/**
* Modifie les propriétées des calques en fonction du mode de vue
*/
function UpdateLayerVisibility()
{
	doCalculerSegments(changeModeVue);	
}

function changeModeVue()
{
	if (document.getElementById('modeVuePhysique').checked) {
		modeBienEtre(false);
		modeTestAffinite(false);
		modeTestInfluence(false);
		layerTexte.visible = true;
		layerPhysique.visible = true;
		layerZones.visible = false;
		layerSegments.visible = false;
		layerSegmentsPhy.visible = false;		
	} else if (document.getElementById('modeVueInfluence').checked) {
		modeBienEtre(true);
		modeTestAffinite(false);
		modeTestInfluence(false);
		layerTexte.visible = true;
		layerPhysique.visible = false;
		layerZones.visible = false;
		layerSegments.visible = false;
		layerSegmentsPhy.visible = true;
	} else if (document.getElementById('modeVueInfluenceZones').checked) {
		modeBienEtre(false);
		modeTestAffinite(false);
		modeTestInfluence(false);
		layerTexte.visible = true;
		layerPhysique.visible = false;
		layerZones.visible = false;
		layerSegments.visible = true;
		layerSegmentsPhy.visible = true;
	} else if (document.getElementById('modeVueEgoiste').checked) {
		modeBienEtre(false);
		modeTestAffinite(true);
		modeTestInfluence(false);
		layerTexte.visible = true;
		layerPhysique.visible = false;
		layerZones.visible = false;
		layerSegments.visible = true;
		layerSegmentsPhy.visible = false;
	} else if (document.getElementById('modeVueAltruiste').checked) {
		modeBienEtre(false);
		modeTestAffinite(false);
		modeTestInfluence(true);
		layerTexte.visible = true;
		layerPhysique.visible = false;
		layerZones.visible = false;
		layerSegments.visible = false;
		layerSegmentsPhy.visible = true;
	} 
	unselectAll();	
}

/**
* Supprime la sélection de tous les items
*/
function unselectAll() {
	layerTexte.selected = false;
	layerPhysique.selected = false;
	layerZones.selected = false;
	layerSegments.selected = false;
	layerSegmentsPhy.selected = false;
}

// --------------------------

/**
* Lance le rafraichissement du mode test affinité si nécessaire
*/
function modeTestAffinite(activate) {
	if (testAffinite != activate) {
		refreshModeAffinite(activate);
	}
}

/**
* Rafraichissement du mode test d'affinité
*/
function refreshModeAffinite(activate) {
	var typePlanteTest = getSelectedTypePlante();
	for (var i = 0; i < segments.length; i++) {
		if (activate) {			
			segments[i].enableModeTestAffinite(typePlanteTest);
		} else {
			segments[i].disableModeTestAffinite();
		}
	}		
	testAffinite = activate;	
}

// --------------------------

var modeBienEtreActif = false;

function modeBienEtre(activate) {
	if (modeBienEtreActif != activate) {
		refreshModeBienEtre(activate);
	}
}

function refreshModeBienEtre (activate) {

	for (var i = 0; i < plantes.length; i++) {
		for (var j = 0; j < plantes[i].segmentsInfluence.length; j++) {
			if (activate) {			
				plantes[i].segmentsInfluence[j].path.strokeColor = plantes[i].segmentsInfluence[j].path.fillColor;
			} else {
				plantes[i].segmentsInfluence[j].path.strokeColor = 'white';
			}
		}
	}		
	modeBienEtreActif = activate;	
	
}

// --------------------------

/**
* Lance le rafraichissement du mode test influence si nécessaire
*/
function modeTestInfluence(activate) {
	if (testInfluence != activate) {
		refreshModeInfluence(activate);
	}
}

/**
* Rafraichissement du mode test d'influence
*/
function refreshModeInfluence(activate) {

	var typePlanteTest = getSelectedTypePlante();
	for (var i = 0; i < plantes.length; i++) {
		for (var j = 0; j < plantes[i].segmentsInfluence.length; j++) {
			if (activate) {			
				plantes[i].segmentsInfluence[j].enableModeTestInfluence(typePlanteTest);
			} else {
				plantes[i].segmentsInfluence[j].disableModeTestInfluence();
			}
		}
	}		
	testInfluence = activate;	
}

