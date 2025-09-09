/**
 * This script will overwrite the ConsigneeDocumentaryAddress Org Code field with a
 * value from the MAPPING list
 * 
 * It assumes the input files will be CargoWise Universal Shipment XML.
 */

const MAPPING = {
  ['AAAAA']: 'ORGA',
  ['BBBBB']: 'ORGB',
  ['CCCCC']: 'ORGC'
}

const handleFile = (file) => {
  userLog.info('Remapping ConsigneeDocumentaryAddress')
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

  const consigneeDocumentaryAddress  = xml.element(xmlDocument, '/UniversalShipment/Shipment/OrganizationAddressCollection/OrganizationAddress[AddressType = "ConsigneeDocumentaryAddress"]/OrganizationCode')
  const portOfDischarge = xml.text(xmlDocument, '/UniversalShipment/Shipment/PortOfDischarge')
  const orgCode = MAPPING[lodash.trim(lodash.toUpper(portOfDischarge))]

  userLog.info(`OrgCode found: ${portOfDischarge}`)
  userLog.info(`New mapped value: ${orgCode}`)

  if (orgCode) {
    userLog.info('Remapping ConsigneeDocumentaryAddress to new OrgCode')
    consigneeDocumentaryAddress.setTextContent(orgCode)
  }

  return {
    ...file,
    body: new xml.XmlSerializer().serializeToString(xmlDocument)
  }
}

const updatedFiles = destinationFiles.map(handleFile).filter(x => x)

if (updatedFiles.length === 0) {
  returnSkipped([])
} else {
  returnSuccess(updatedFiles)
}