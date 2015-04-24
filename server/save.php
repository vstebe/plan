<?php
 header('Access-Control-Allow-Origin: *');  

    $filename = './json/'.basename($_POST['filename']).'.json';
    
    //Recup les donnees du plan et les ecrits dans un fichier
    $data = $_POST['data'];
    file_put_contents($filename, $data);
?>