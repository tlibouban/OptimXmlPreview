@echo off
echo Testing conversion with Font Awesome icons...
node ConvertXmlToHtml.js --output ./Output --source-file "./Data/test_real_structure.xml"
echo.
echo Test completed! Check the Output folder for the generated HTML file.
pause 