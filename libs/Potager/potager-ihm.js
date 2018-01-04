// -----------------------------------------------
// VARIABLES
// -----------------------------------------------

// action sélectionnée (déterminée au mousedown)
var action = 'none';

// action débutée (déterminée au drag)
var dragAction = 'none';	

// configuration clavier
var resizeKey = 'r';
var deleteKey = 's';
var cloneKey = 'c';	
var zoomDownViewKey = '-';
var zoomUpViewKey = '+';
var textDownKey = 'm';
var textUpKey = 'p';

// -----------------------------------------------
// INITIALISATION
// -----------------------------------------------

/**
* Bind les évenements IHM
*/
function initializeIHM() {

	// Initialisation des evenements souris
	var tool = new Tool();
	tool.onMouseDown = toolonMouseDown;
	tool.onMouseDrag = toolonMouseDrag;
	tool.onMouseUp = toolonMouseUp;
	tool.onMouseMove = toolonMouseMove;
	
	// Initialisation des evenements clavier
    document.addEventListener('keydown', toolKeyDown, false);	
	
	// Initialise les interractions IHM
	document.getElementById('modeVuePhysique').onclick = function(){ UpdateLayerVisibility(); };
	document.getElementById('modeVueInfluence').onclick = function(){ UpdateLayerVisibility(); };
	document.getElementById('modeVueInfluenceZones').onclick = function(){ UpdateLayerVisibility(); };
	document.getElementById('modeVueEgoiste').onclick = function(){ UpdateLayerVisibility(); };
	document.getElementById('modeVueAltruiste').onclick = function(){ UpdateLayerVisibility(); };	
	document.getElementById('addPlanteType').onchange = function(){ changeSelectedPlante(); };	
	document.getElementById('sauvegarder').onclick = function(){ savePlantes(); };
	document.getElementById('charger').onchange = function(){ loadPlantes(); };	
}


/**
* Initialise le sélecteur de légume
*/
function initialiserSelecteurLegumes() {
	
	// Recopie du tableau initial
	var plantesTypeCopy = [];
	for (var i = 0; i < plantesType.length; i++) {
		if(typeof plantesType[i] != 'undefined') {		
			plantesTypeCopy[plantesTypeCopy.length] = {type:plantesType[i], code:i};
		}
	}	
	
	// Tri par ordre alpha
	plantesTypeCopy.sort(function (a,b) {
	  if (a.type < b.type)
		return -1;
	  if (a.type > b.type)
		return 1;
	  return 0;
	});
	
	// Ajout dans le selecteur
	var x = document.getElementById("addPlanteType");
	for (var i = 0; i < plantesTypeCopy.length; i++) {
		var option = document.createElement("option");
		option.text = plantesTypeCopy[i].type;
		option.value = plantesTypeCopy[i].code;
		x.add(option);
	}
	
	// Sélction du premier élement
	x.selectedIndex = 0;
}

// -----------------------------------------------
// LECTURE DES INFOS IHM
// -----------------------------------------------	

/**
* Retourne l'id de type de plante sélectionné
*/
function getSelectedTypePlante() {
	var e = document.getElementById("addPlanteType");
	var typePlanteId = e.options[e.selectedIndex].value;	
	return typePlanteId;
}

/**
* Retourne la forme sélectionnée
*/
function getPlanteForme() {	
	var forme = '';	
	if (document.getElementById('addPlanteFormeRond').checked) {
	  forme = document.getElementById('addPlanteFormeRond').value;
	} else if (document.getElementById('addPlanteFormeRectangle').checked) {
	  forme = document.getElementById('addPlanteFormeRectangle').value;
	}
	return forme;
}

/**
* Détermine si la vue est la vue physique
*/
function isVuePhysique() {
	return document.getElementById('modeVuePhysique').checked;	
}

// -----------------------------------------------
// GESTION DE LA SOURIS
// -----------------------------------------------

var selectedPlantes = [];

function setSelection(event) {
	setSelectionByItemId(event.item.id);
}

function setSelectionByItemId(itemId) {
	setSelectionByPlanteIndex(getIndexOfPlante(itemId));
}

function setSelectionByPlanteIndex(planteIndex) {
	if (planteIndex || (planteIndex === 0)) {
		if (!isSelected(planteIndex)) {
			selectedPlantes.push(planteIndex);
			plantes[planteIndex].pathPhy.fillColor = '#efe3cb';
		} else {
			var index = selectedPlantes.indexOf(planteIndex);
			selectedPlantes.splice(index, 1);
			plantes[planteIndex].pathPhy.fillColor = '#c4c4c4';			
		}
	}	
}

function unSelectAllSelection() {
	for (var i = 0; i < selectedPlantes.length; i++) {
		plantes[selectedPlantes[i]].pathPhy.fillColor = '#c4c4c4';	
	}	
	selectedPlantes = [];
}

function isSelected(planteIndex) {
	return selectedPlantes.includes(planteIndex);
}

// MouseDown
var toolonMouseDown = function onMouseDown(event) {								                	

    dragAction = 'none';
 
    if (event.modifiers.shift) {
        action = 'pan';
    } else {
 
        // Si un élement est sous la sélection
        if (isVuePhysique()) {
            if (event.item) {
 
                // Sélection de la plante sous le clic
                curr_plante = getPlante(event.item.id);
 
                if (curr_plante == null) 
                {
                    // il y a bien un item sous le clic mais ce n'est pas une plante                
                    action = 'create';
                    curr_plante = 'none';
 
                } else {                             					
							 
                    layerPhysique.addChild(curr_plante.pathPhy);
                    // Traitement selon touche
                    if (Key.isDown(resizeKey))
                    {
                        // Si la touche de resize est enfoncée
                        action = 'resize';                                      
                    } 
                    else
                    {       
                        // Sinon on entre en mode déplacement
                        action = 'moving';
                    } 
                }
            }       
            else
            {
                // Sinon on passe en mode création  
                action = 'create';
                curr_plante = 'none';
            }   
        }
    }
}

// MouseDrag
var toolonMouseDrag = function onMouseDrag(event) {

	switch(action) {

		// Création de la plante
		case 'create':
			var rect = new Rectangle(event.downPoint, event.point);
			curr_plante = creerPlante(getSelectedTypePlante(), rect, getPlanteForme());
			AfficherInfosContextuelles(event,curr_plante);		
			unSelectAllSelection();	
			break;

		// Déplacement
		case 'moving':		
			for (var i = 0; i < selectedPlantes.length; i++) {
				plantes[selectedPlantes[i]].move(event.delta);
			}
			AfficherInfosContextuelles(event);	
			break;
			
		// Redimentionnement
		case 'resize':
			for (var i = 0; i < selectedPlantes.length; i++) {
				plantes[selectedPlantes[i]].resize(event);
			}
			AfficherInfosContextuelles(event,curr_plante);	
			break;			
			
		// Déplacement de la vue
		case 'pan':
			paper.view.center = new Point(
				paper.view.center.x + (event.downPoint.x - event.point.x), 
				paper.view.center.y + (event.downPoint.y - event.point.y)
				);
			AfficherInfosContextuelles(event,curr_plante);	
			break;			
	}

	dragAction = action;
};

var toolonMouseUp = function onMouseUp(event) {

console.log(event.item.id);
	switch(action) {
		
		// Stockage de la plante
		case 'create':
			if (curr_plante != 'none') ajouterPlante(curr_plante);	
			
		// Recalcul les segments
		case 'moving':
		case 'resize':	
			if (dragAction != 'none') {				
				setCalculerSegments();
				doCalculerSegments();				
			} else {
				console.log(event.item.id);
				setSelection(event);
			}
			break;
		
		case 'pan':
		break;

		default:
			setSelection(event);
			break;						
	}
	
	if (getPlante(event.item.id) == null) {
		if (action != 'pan') unSelectAllSelection();
	}
		
	// Fin de l'action souris
	action = 'none';
}	

var toolonMouseMove = function onMouseMove(event) {		

	// Gestion de la sélection
    unselectAll();
	
	// Sélection de la plante sous le texte
    if (event.item)
	{
		plante = getPlante(event.item.id);
		if (plante != null) {
			plante.pathPhy.selected = true;	
		}	
	}

	// Affichage contextuel
	AfficherInfosContextuelles(event);		
}		

// -----------------------------------------------
// GESTION DU CLAVIER
// -----------------------------------------------
		
var toolKeyDown = function keyDown(event) {

	switch(event.key) {
		
		// Suppression d'une plante
		case deleteKey:
			var plantePhyIds = [];
			for (var i = 0; i < selectedPlantes.length; i++) {
				plantePhyIds[plantePhyIds.length] = plantes[selectedPlantes[i]].pathPhy.id;
			}
			for (var i = 0; i < selectedPlantes.length; i++) {
				var plante = getPlante(plantePhyIds[i]);
				plante.remove();
			}
			selectedPlantes = [];
			AfficherInfosContextuelles(event);
			setCalculerSegments();
			doCalculerSegments();		
			break;
			
		// Zoom de la vue
		case zoomDownViewKey:
			paper.view.zoom = Math.max(0.1, paper.view.zoom - 0.1) ;
			break;	
		case zoomUpViewKey:
			paper.view.zoom += 0.1 ;			
			break;		
			
		// Taille du texte
		case textDownKey:		
			downSizeText();
			break;			
		case textUpKey:
			upSizeText();
			break;		

		// Clone de la sélection
		case cloneKey:

			// Feinte pour éviter le removeOnDrag
			reloading = true;

			// Création des clones
			var clonesPlantesIndex = [];
			for (var i = 0; i < selectedPlantes.length; i++) {
				var srcPlante = plantes[selectedPlantes[i]];
				var newPlante = creerPlante(
					srcPlante.typePlanteId, 
					new Rectangle({
        				x : srcPlante.pathPhy.bounds.x +20,
        				y : srcPlante.pathPhy.bounds.y +20,
        				width : srcPlante.pathPhy.bounds.width,
        				height : srcPlante.pathPhy.bounds.height,
        			}),
					srcPlante.forme
					);
				clonesPlantesIndex[clonesPlantesIndex.length] = plantes.length;
				ajouterPlante(newPlante);
			}

			// Déselectionne les sources et sélectionne les clones
			unSelectAllSelection();
			for (var i = 0; i < clonesPlantesIndex.length; i++) {
				setSelectionByPlanteIndex(clonesPlantesIndex[i]);
			}
			break;	

			// Feinte pour éviter le removeOnDrag
			reloading = false;
	} 
	
	// Arrête la propagation
	//event.preventDefault();	
	
}

// -----------------------------------------------
// GESTION DU TOOLTIP
// -----------------------------------------------

/**
* Met à jour le contenu du panneau contextuel
*/
function showInfoPanel(text)
{			
	document.getElementById("contextContent").innerHTML = text;		
	if (text != ''){
		document.getElementById("panneauContextuel").style.cssText = "display:block";		
	} else {
		document.getElementById("panneauContextuel").style.cssText = "display:none";	
	}	
}

/**
* Met à jour la position du panneau contextuel
*/
function setDivPos(pos) {
	if (pos.x < 0) pos.x = 0;
	if (pos.y < 0) pos.y = 0;
	document.getElementById("panneauContextuel").style.left = pos.x + "px";
	document.getElementById("panneauContextuel").style.top = pos.y + "px";
}

/**
* Affiche les infos contextuels 
*/
function AfficherInfosContextuelles(event, item = null)
{
	var PaperItem = event.item;
	
	// Obtiens l'item survolé (plante ou segment)
	if (item == null) {
		if (PaperItem) {		
			item = getPlante(PaperItem.id);	
			if (!item) {
				item = getSegment(PaperItem.id);
				if (!item) {
					item = getSegmentPhy(PaperItem.id);
				}
			}
		}
	} 
	
	// Affiche les infos
	var infos = '';
	if (item) infos = item.getInfos() + '<br/>';
	showInfoPanel(infos);
	setDivPos(event.event);
}
  