// スクリプトプロパティのキー（グローバルスコープで宣言）
const SAY_POET_BLUE_TOKEN_KEY = 'SAY_POET_BLUE_TOKEN';

// Unicodeエスケープシーケンスをデコード
function decodeUnicodeEscape(str) {
  return str.replace(/\\u([\d\w]{4})/gi, (match, grp) =>
    String.fromCharCode(parseInt(grp, 16))
  );
}

// つぶやきデータを取得
function fetchTweets() {
  const token = PropertiesService.getScriptProperties().getProperty(SAY_POET_BLUE_TOKEN_KEY);
  const apiUrl = 'https://say.poet.blue/search?q=';
  const options = {
    'method': 'get',
    'headers': {
      'Cookie': `token=${token}`,
    },
    'muteHttpExceptions': true,
  };
  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    console.log('Response Code:', responseCode);
    if (responseCode !== 200) {
      throw new Error(`APIリクエストが失敗しました。ステータスコード: ${responseCode}`);
    }
    const tweets = JSON.parse(responseBody);
    console.log('取得したつぶやき数:', tweets.length);
    // Unicodeエスケープシーケンスをデコード
    return tweets.map(tweet => ({
      ...tweet,
      content: decodeUnicodeEscape(tweet.content)
    }));
  } catch (e) {
    console.error('エラー:', e.toString());
    return []; // エラー時は空配列を返す
  }
}

// Googleカレンダーの最後のイベントの時刻を取得
function getLastEventTime(calendarId) {
  const calendar = CalendarApp.getCalendarById(calendarId);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const events = calendar.getEvents(oneYearAgo, now); // 過去1年間のイベントを取得
  if (events.length === 0) {
    return null;
  }
  // 最新のイベントの開始時刻を返す
  return events[events.length - 1].getStartTime();
}

// Googleカレンダーにイベントを追加
function addEventToCalendar(content, createdAt, calendarId) {
  const startTime = new Date(createdAt); // 文字列をDateオブジェクトに変換
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30分後を終了時間に設定
  const calendar = CalendarApp.getCalendarById(calendarId);
  calendar.createEvent(
    `${content}`,
    startTime,
    endTime,
    {
      location: 'https://say.poet.blue',
    }
  );
}

// メイン処理
function main() {
  const tweets = fetchTweets();
  if (tweets.length === 0) {
    console.log('つぶやきが見つかりませんでした。');
    return;
  }

  const targetCalendarId = ''; //ここにカレンダーIDを入力
  const lastEventTime = getLastEventTime(targetCalendarId);

  tweets.forEach(tweet => {
    const createdAt = new Date(tweet.created_at); // 文字列をDateオブジェクトに変換
    if (!lastEventTime || lastEventTime < createdAt) {
      addEventToCalendar(tweet.content, tweet.created_at, targetCalendarId);
      console.log('カレンダーに追加:', tweet.content);
    }
  });
}
