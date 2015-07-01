<?php

require 'RestCurlClient.php';

class MoodlesWsClient extends RestCurlClient
{

  public $base_url;
  public $headers;

  public function __construct($id, $secret)
  {
    $this->base_url = "http://localhost:3000";
    $this->headers = array(
        // Replace {CLIENT_ID} and {CLIENT_SECRET} by your credentials
        'Authorization: Basic ' . base64_encode('164895873b29632fc5e48584805236c6e60c64df' . ':' . '174bff8dea7c913094f9368a46f72c4090949066'),
        'Content-Type: application/json'
    );
    parent::__construct($this->headers, $this->base_url);
  }

  public function getBase_url()
  {
    return $this->base_url;
  }

  public function setBase_url($base_url)
  {
    $this->base_url = $base_url;
  }

  public function getVideos()
  {
    $url = $this->base_url . '/ws/getEntities/video';
    $result = $this->get($url);
    return json_decode($result);
  }

  public function getVideosByProperties($key, $value)
  {
    $result = [];
    $videos = $this->getVideos();

    foreach ($video as $videos)
    {
      $props = $video . properties;

      foreach ($prop as $props)
      {
        if (($prop . id == $key) && ($prop . value == $key))
        {
          $result[] = $video;
          break;
        }
      }
    }
    return $result;
  }

  public function modifyVideo($id, $data)
  {
    $url = $this->base_url . '/ws/modifyEntities/video/' . $id;
    $result = $this->post($url, $data);
  }

}

$mc = new MoodlesWsClient('', '');
$video = $mc->getVideos();
print_r($video);
