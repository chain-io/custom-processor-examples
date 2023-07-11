
// Iterate through each file and set the file_name property to file_<index+1>.txt
const files = lodash.map(destinationFiles, (file, index) => {
  const newFileName = `file_${index + 1}.txt`
  if (file.file_name) {
    userLog.info(`Overwriting file_name ${file.file_name} to ${newFileName}`)
  }
  return {
    ...file,
    file_name: newFileName
  }
})
files
