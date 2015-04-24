<?php
 header('Access-Control-Allow-Origin: *');  

 
$filename = './json/'.basename($_GET['filename']).'.json'; //Chemin du fichier

//Si le fichier existe bien, on le renvoit
if(file_exists($filename))
    echo file_get_contents($filename);
?>