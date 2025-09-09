/**
 * This script will copy the port of discharge code and name to the port of destination
 * 
 * It assumes the input files will be CargoWise Universal Shipment XML.
 */
const handleFile = (file) => {
  // get the body
  const source = file.body
  // parse the xml - by default parseFromString will remove namespaces.
  // If you're simply extracting data, then this is ok, however if you're. 
  // modifying an xml document in place, you typically do not want to remove namespaces.
  let xmlDocument
  try {
    xmlDocument = xml.XmlParser.parseFromString(source, { strip_namespace: false })
  } catch (err) {
    userLog.warning(`Skipping invalid xml file ${file.file_name}.`)
    return
  }

  const portOfDestination = xml.element(xmlDocument, '/UniversalShipment/Shipment/SubShipmentCollection/SubShipment/PortOfDestination')
  const portOfDischarge = xml.element(xmlDocument, '/UniversalShipment/Shipment/SubShipmentCollection/SubShipment/PortOfDischarge')

  // only copy the values if both port of destination and port of discharge exist
  if(portOfDestination && portOfDischarge) {
    const code = xml.text(portOfDischarge, 'Code')
    const name = xml.text(portOfDischarge, 'Name')

    const portOfDestinationCode = xml.element(xmlDocument, '/UniversalShipment/Shipment/SubShipmentCollection/SubShipment/PortOfDestination/Code')
    const portOfDestinationName = xml.element(xmlDocument, '/UniversalShipment/Shipment/SubShipmentCollection/SubShipment/PortOfDestination/Name')
    portOfDestinationCode.setTextContent(code)
    portOfDestinationName.setTextContent(name)
  }

  return {
    ...file,
    body: new xml.XmlSerializer().serializeToString(xmlDocument)
  }
}

const updatedFiles = sourceFiles.map(handleFile).filter(x => x)

if (updatedFiles.length === 0) {
  returnSkipped([])
} else {
  returnSuccess(updatedFiles)
}