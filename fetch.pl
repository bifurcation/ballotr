#!/usr/bin/perl 

use CGI; 
use WWW::Mechanize;

$cgi = new CGI; 
$url = $cgi->url_param("url");

my $browser = LWP::UserAgent->new();
my $response = $browser->get($url);

print $cgi->header();
print $response->content;
