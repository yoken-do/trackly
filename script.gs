
// Определяем переменные, в которых храним:
// URL на таблицу Google Sheets
// Названия листов
// Заголовок сайта (отображается в браузере)
// Иконка сайта (png формат)
const SHEET_URL = "";
const PLACE_NAME = "";
const PLACE_TYPE = "";
const CHECKING = "";
const COMMENT = "";
const REACTION = "";
const TITLE = "Trackly";
const FAVICON = "https://raw.githubusercontent.com/yoken-do/untracked/main/icon.png";


const PHOTOS_FOLDER_NAME = "название папки"

const PHOTOS_FOLDER = DriveApp.getFoldersByName(PHOTOS_FOLDER_NAME)

const spread = SpreadsheetApp.openByUrl(SHEET_URL);

const placeList = spread.getSheetByName(PLACE_NAME);
const typeList = spread.getSheetByName(PLACE_TYPE);
const checkingList = spread.getSheetByName(CHECKING);
const commentList = spread.getSheetByName(COMMENT);
const reactionList = spread.getSheetByName(REACTION);

// Триггер doGet(e) запускается автоматически, 
// когда пользователь посещает веб-приложение 
// или когда программа отправляет HTTP-запрос GET в веб-приложение.
function doGet(e)
{
 return HtmlService.createHtmlOutputFromFile('index').setTitle(TITLE).setFaviconUrl(FAVICON);
}

function getPlaceNameList()
{
  const data = getPlaceList().slice(1).map(row => row[0]);
  return data;
}

function getPlaceId(name) {
  const data = getPlaceList().slice(1);
  
  const rowIndex = data.findIndex(row => row[0] === name);
  
  return rowIndex !== -1 ? rowIndex + 1 : null;
}

function getTypeId(type) {
  const data = getTypeList().slice(1);
  
  const rowIndex = data.findIndex(row => row[0] === type);
  
  return rowIndex !== -1 ? rowIndex + 1 : null;
}

function getReactionId(reaction) {
  const data = getReactionList().slice(1);
  
  const rowIndex = data.findIndex(row => row[0] === reaction);
  
  return rowIndex !== -1 ? rowIndex + 1 : null;
}

// Функция добавления строки
function addEntry(list)
{
  placeList.appendRow(list);
}

// Функция для координат
function getPlaceList()
{
  return placeList.getDataRange().getValues();
}

function getTypeList()
{
  return typeList.getDataRange().getValues();
}

function getReactionList()
{
  return reactionList.getDataRange().getValues();
}

function getName(lan, lon)
{
  const data = placeList.getDataRange().getValues();
  const foundRow = data.find(row => row[1] == lan && row[2] == lon);
  return foundRow ? foundRow[0] : null;
}
