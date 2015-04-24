<?php
 header('Access-Control-Allow-Origin: *');  

//Liste des fichiers
$files = scandir("./json/");
$res = array();
foreach($files as $file) {
    //Si c'est bien un fichier json
    if(strpos($file, '.json'))
        $res[] = str_replace('.json', '', $file);
}

//On envoit la liste en format json
echo json_encode($res);
?>