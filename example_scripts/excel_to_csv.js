const doWork = (f, idx) => {
  // skip non-excel files
  if (!f.file_name?.match(/\.xls[xbm]$/)) return null;

  // read the workbook and get the first sheet
  const workbook = XLSX.read(f.body, { type: 'base64' })
  const sheetNames = workbook.SheetNames
  if (!sheetNames || !sheetNames.length) {
    throw new Error('No sheets found in Excel file')
  }
  const worksheet = workbook.Sheets[sheetNames[0]]

  // use the built in CSV converter
  const body = XLSX.utils.sheet_to_csv(worksheet, { defval: null }).toString()

  // fix the file name
  const fName = f.file_name.split('.')
  fName.pop()
  fName.push('csv')
  return {
    uuid: uuid(),
    type: 'file',
    file_name: fName.join('.'),
    format: 'csv',
    mime_type: 'text/csv',
    body 
  }
}

const files = sourceFiles.map(doWork).filter(x => x)
returnSuccess(files)
