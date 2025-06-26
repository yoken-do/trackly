
// Определяем переменные, в которых храним:
// URL на таблицу Google Sheets
// Названия листов
// Заголовок сайта (отображается в браузере)
// Иконка сайта (png формат)
const SHEET_URL = "";
const PLACE_NAME = "place";
const PLACE_TYPE = "place_type";
const CHECKING = "checking";
const COMMENT = "comment";
const REACTION = "reaction";
const TITLE = "Trackly";
const FAVICON = "https://raw.githubusercontent.com/yoken-do/trackly/main/icon.png";

const PHOTOS_FOLDER_NAME = "Photos";

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
  const html = HtmlService.createHtmlOutputFromFile('index');
  html.setTitle(TITLE);
  html.setFaviconUrl(FAVICON);
  return html;
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

function addEntryChecking(data)
{
  checkingList.appendRow(data);
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

function getOrCreateFolder(baseFolder, folderName) {
  const folders = baseFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    Logger.log('Создаю папку: ' + folderName + ' в ' + baseFolder.getName());
    return baseFolder.createFolder(folderName);
  }
}

function processFormData(formData, filesData) {
  try {
    Logger.log('Получены данные формы: ' + JSON.stringify(formData));
    if (filesData && typeof filesData.length !== 'undefined') {
        Logger.log('Получено файлов: ' + filesData.length);
    } else {
        Logger.log('Данные о файлах не получены или некорректны. filesData будет пустым массивом.');
        filesData = [];
    }

    // Проверяем наличие ключевых листов
    if (!placeList) return "Ошибка: Лист для данных о местах ('" + PLACE_NAME + "') не найден.";
    if (!commentList) return "Ошибка: Лист для комментариев ('" + COMMENT + "') не найден.";
    if (!checkingList) return "Ошибка: Лист для проверки ('" + CHECKING + "') не найден.";

    // Извлекаем все данные из formData, которые приходят с клиента
    const placeNameFromForm = formData.placeName || 'Без названия';
    const descriptionFromForm = formData.description || 'Нет описания';
    const costFromForm = (typeof formData.cost === 'number' && !isNaN(formData.cost)) ? formData.cost : 0;
    const placeTypeFromForm = formData.place_type || 'Не указан';
    const acoordsFromForm = formData.acoords; // Массив [lat, lon] или null
    const commentTextFromForm = formData.comment || "";
    const reactionNameFromForm = formData.reaction; // 'like', 'norm', 'fu' или null
    const relevanceFromForm = formData.relevance; // 0 или 1

    let placeEntryId; // ID места для связи таблиц (обычно номер строки в placeList)
    const timestamp = new Date(); // Для листа CHECKING

    // Генерируем ID для папки с фото = номер след. строки листа COMMENT.
    // Это имя папки, куда будут загружены фото для данного комментария.
    const photoSubfolderName = (commentList.getLastRow() + 1).toString();

    // Работа с Google Drive для фото
    let photosFolderUrl = null;
    let rootPhotosFolder; // Переменная для корневой папки "Photos"

    // Получаем корневую папку проекта
    const spreadsheetFile = DriveApp.getFileById(spread.getId());
    let projectFolder = DriveApp.getRootFolder(); // По умолчанию, если таблица в корне
    const parents = spreadsheetFile.getParents();
    if (parents.hasNext()) {
        projectFolder = parents.next();
    } else {
        Logger.log("ВНИМАНИЕ: Таблица находится в корне Google Диска. Папка '" + PHOTOS_FOLDER_NAME + "' будет создана в корне.");
    }
    rootPhotosFolder = getOrCreateFolder(projectFolder, PHOTOS_FOLDER_NAME); // Используем вашу константу PHOTOS_FOLDER_NAME

    // Теперь создаем подпапку для фото данного комментария
    const specificPhotoFolder = getOrCreateFolder(rootPhotosFolder, photoSubfolderName); // Передаем rootPhotosFolder
    photosFolderUrl = specificPhotoFolder.getUrl();

    if (filesData && filesData.length > 0) {
      Logger.log('Начинаю загрузку ' + filesData.length + ' файлов в папку: ' + specificPhotoFolder.getName());
      for (let i = 0; i < filesData.length; i++) {
        const file = filesData[i];
        if (file && file.base64Content && file.mimeType && file.fileName) {
            try {
                const decoded = Utilities.base64Decode(file.base64Content);
                const blob = Utilities.newBlob(decoded, file.mimeType, file.fileName);
                specificPhotoFolder.createFile(blob); // Сохраняем в specificPhotoFolder
                Logger.log('Файл сохранен: ' + file.fileName);
            } catch (e) {
                Logger.log("Ошибка при сохранении файла " + file.fileName + ": " + e.toString());
            }
        } else {
            Logger.log('Пропущен некорректный файловый объект: ' + JSON.stringify(file));
        }
      }
    } else {
      Logger.log('Фотографии не были прикреплены.');
    }

    // Обработка данных в зависимости от relevance
    if (relevanceFromForm === 1) { // Новое место
        if (!acoordsFromForm || acoordsFromForm.length !== 2 || typeof acoordsFromForm[0] !== 'number' || typeof acoordsFromForm[1] !== 'number') {
            Logger.log("Ошибка: Координаты для нового места не предоставлены или некорректны: " + JSON.stringify(acoordsFromForm));
            return "Ошибка: Координаты для нового места не предоставлены или некорректны.";
        }
        const typeId = getTypeId(placeTypeFromForm); // Используем вашу функцию
        
        // Добавляем в лист "place" (placeList)
        // Структура: Название(0), Широта(1), Долгота(2), Описание(3), ID типа(4), Цена(5)
        const newPlaceData = [placeNameFromForm, acoordsFromForm[0], acoordsFromForm[1], descriptionFromForm, costFromForm, typeId];
        addEntry(newPlaceData); // Используем вашу функцию addEntry для placeList
        placeEntryId = placeList.getLastRow(); // ID нового места - номер его строки
        Logger.log('Новое место добавлено в "' + PLACE_NAME + '". ID (строка): ' + placeEntryId);

        // Добавляем в лист "checking" (checkingList)
        // Структура: ID места, timestamp, cost, relevance (1)
        const checkingDataNew = [placeEntryId, timestamp, costFromForm, 1];
        addEntryChecking(checkingDataNew)
        Logger.log('Данные для нового места добавлены в "' + CHECKING + '".');

    } else { // Существующее место (relevanceFromForm === 0)
        placeEntryId = getPlaceId(placeNameFromForm); // Используем  функцию getPlaceId
        if (!placeEntryId) {
            return 'Ошибка: Существующее место "' + placeNameFromForm + '" не найдено в базе.';
        }
        const checkingDataExisting = [placeEntryId, timestamp, costFromForm, 0];
        addEntryChecking(checkingDataExisting);
        Logger.log('Данные (комментарий) для существующего места добавлены в "' + CHECKING + '".');
    }

    // Добавляем в лист "comment" (commentList) для обоих случаев
    const reactionId = getReactionId(reactionNameFromForm); // Используем функцию getReactionId
    
    // Структура листа COMMENT: ID места (из placeList)(0), ID реакции(1), Комментарий(2), URL папки с фото(3)
    const commentData = [placeEntryId, reactionId, commentTextFromForm, photosFolderUrl];
    commentList.appendRow(commentData);
    Logger.log('Комментарий добавлен в "' + COMMENT + '". ID места: ' + placeEntryId);

    return "Данные успешно обработаны. ID места (строка в листе '" + PLACE_NAME + "'): " + placeEntryId;

  } catch (error) {
    let errorMessage = error.toString();
    if (error.message && error.fileName && error.lineNumber) {
        errorMessage = `Ошибка: ${error.message} в файле ${error.fileName}, строка ${error.lineNumber}. Stack: ${error.stack}`;
    }
    Logger.log('Критическая ошибка в processFormData: ' + errorMessage);
    return 'Произошла ошибка на сервере: ' + error.toString();
  }
}

