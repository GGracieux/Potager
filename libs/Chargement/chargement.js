function getById(id){
	return document.getElementById(id);
}

function showProgress(){ 			
	var ovrl = getById('chargement'); 
	ovrl.style.opacity = 100;
	ovrl.style.display = 'block';
}

function hideProgress()
{
	var ovrl = getById('chargement'); 
	ovrl.style.opacity = 0;
	setTimeout(function(){ 
	ovrl.style.display = "none";
	}, 1200);
}