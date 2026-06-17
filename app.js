Bangle.removeAllListeners();
clearInterval();
clearWatch();

g.clear();

try {
  require("Font6x8").add(Graphics);
  require("Font8x12").add(Graphics);
  require("Font7x11Numeric7Seg").add(Graphics);
} catch (e) {
  // Fonts may already be cached by another app while testing from the terminal.
}

let hasSevenSegmentFont = false;

function loadSevenSegmentFont() {
  if (hasSevenSegmentFont) return true;

  try {
    g.setFont("7x11Numeric7Seg", 3);
    hasSevenSegmentFont = true;
    return true;
  } catch (e) {
    hasSevenSegmentFont = false;
    return false;
  }
}

function diaES(d) {
  return ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][d.getDay()];
}

function getTempNumber() {
  const data = require("Storage").readJSON("advcasio.data.json", true);
  if (data && data.weather && data.weather[0] && data.weather[0][0] !== undefined) {
    return String(data.weather[0][0]);
  }
  return "--";
}

function getBackgroundImage() {
  return {
    width: 176,
    height: 176,
    bpp: 1,
    buffer: require("heatshrink").decompress(atob("AFcB/4ASwEDCqfgg4VT+EPAgZIBDhoVEFaXPCiPzCoO/CqP9CoPnCqP2K6n6CoPfCtZuE/v+ChP+CrOwgnQCqWxwlGv4VSzsGCqWzwuQNrP8jfgoOB+FuwMG9keCpX97fmpml+/uzMytveCoe4h8eg1gnorECoPgwMyloVFh0MuVACpGDmXNComx/1Mv1PzpBDrhBE5ueCon840CCofYk9d0ptBzJtG2Pkg3yp8dTJ+4gHggRXCCp28jP3g1wvrFWCp3fCon/v4VI/oVDEhIAHCv4VF4EAAB0DCoeACp8BCqkACuE/QJv8CotgFJsGCoqaOgYVEwOfIJv9wAVDwcwFZsM4AVEK59ACoMJCoNACpsCCoOQFYQVRIIYV/Cv4Vsbf4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/CsFgCpsGComBmAVNhnAComf/4AM/OACoeA4ArNgcACol/FZv+Cos/Cpv8CopANAAQVqgIVDQRwVGNZoADCv4Vb8/xA4Of8f+v4eBBAPgv+D/7rBIN6/KhzxJCpkPFIPwCqMYAgMQCosBkvn334n375fPwAVBmEyvwYBCouv//+CoXr94VCsczv8MCo2tmcw5Ey4UKgxBCod24cICokd4Ot+c+FYPz9fmjvOCoX/CoorC+cw7E2wFoswrC4f8/wVH/szn2ImRXB8wVD3uONoyZLscZgkwCqM/YoPgCqLxIwAVPgIVDGYIAPCv4VE94VR+wVB2GAg0AsEAvB5BwGAjh/BkEAgeAh+dIKn7CoIURAAPwg4Vp8EDCqfAfIgAmA="))
  };
}

function drawBackground() {
  // Draw the imported frame/background image exactly as converted.
  // Do not tint it here.
  g.clear();
  g.drawImage(getBackgroundImage(), -5, -4, { scale: 1.04 });
  g.setColor(0);
}

function drawDataBackgrounds() {
  // Fill the whole dynamic LCD/data area with one consistent Matrix-green tone.
  // This removes the old pale/white background gaps between the individual data blocks.
  g.setColor(0, 0.7, 0.15);
  g.fillRect(14, 32, 164, 144);
  g.setColor(0);
}

function drawBigThenSmall(big, small, x, y, color) {
    g.setColor(color);
    g.setFontAlign(-1, 0);
  
    if (loadSevenSegmentFont()) {
      g.setFont("7x11Numeric7Seg", 2);
      g.drawString(String(big), x, y);
      x += g.stringWidth(String(big)) + 2;
      g.setFont("6x8", 1);
      g.drawString(small, x, y + 1);
      return;
    }
  
    g.setFont("6x8", 2);
    g.drawString(String(big) + small, x, y);
  }

function getTimePosition() {
  if (loadSevenSegmentFont()) {
    return { x: 85, y: 88 };
  }

  return { x: 90, y: 88 };
}

function drawTime(now) {
  const timeText = require("locale").time(now, 1);
  const pos = getTimePosition();

  g.setColor(0);
  g.setFontAlign(0, 0);

  if (loadSevenSegmentFont()) {
    g.setFont("7x11Numeric7Seg", 3);
    g.drawString(timeText, pos.x, pos.y);
    return;
  }

  g.setFont("Vector", 38);
  g.drawString(timeText, pos.x, pos.y);
}

function getMetricPositions() {
  if (loadSevenSegmentFont()) {
    return {
      tempX: 26,
      tempY: 50,
      battX: 120,
      battY: 50,
      dateX: 92,
      dateY: 132,
      stepsX: 124,
      stepsY: 132
    };
  }

  return {
    tempX: 30,
    tempY: 50,
    battX: 120,
    battY: 50,
    dateX: 92,
    dateY: 132,
    stepsX: 124,
    stepsY: 132
  };
}

function drawMain() {
  drawBackground();
  drawDataBackgrounds();

  const now = new Date();
  const health = Bangle.getHealthStatus("day") || {};
  const steps = health.steps || 0;
  const batt = E.getBattery();
  const pos = getMetricPositions();

  // Top small data area.
  drawBigThenSmall(getTempNumber(), "°", pos.tempX, pos.tempY, 0);
  drawBigThenSmall(batt, "%", pos.battX, pos.battY, 1);

  // Main time.
  drawTime(now);

  // Bottom data area.
  g.setColor(1, 1, 1);
  g.setFontAlign(0, 0);
  g.setFont("6x8", 2);
  g.drawString(diaES(now) + " " + now.getDate() + "/" + (now.getMonth() + 1), pos.dateX, pos.dateY);
  //g.drawString("P." + steps, pos.stepsX, pos.stepsY);
}

function draw() {
  drawMain();
}

draw();

setInterval(draw, 60000);