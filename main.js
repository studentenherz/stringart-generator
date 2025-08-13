import init, { generate_stringart } from "./libstringart.js";

// Initialize WASM module
let wasmInitialized = false;

async function initWasm() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

// DOM elements
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const originalImage = document.getElementById("originalImage");
const stringartSvg = document.getElementById("stringartSvg");
const stringartPlaceholder = document.getElementById("stringartPlaceholder");
const loadingOverlay = document.getElementById("loadingOverlay");
const colorPicker = document.getElementById("colorPicker");
const thicknessInput = document.getElementById("thicknessInput");
const linesInput = document.getElementById("linesInput");
const pointsInput = document.getElementById("pointsInput");
const weightInput = document.getElementById("weightInput");

let currentFileData = null;
let currentStringArtData = null;

// Initialize WASM on page load
initWasm();

// Drag and drop functionality
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    handleImageFile(files[0]);
  }
});

uploadArea.addEventListener("click", () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleImageFile(e.target.files[0]);
  }
});

// Generate button click
generateButton.addEventListener("click", generateStringArt);

// Download button click
downloadButton.addEventListener("click", downloadStringArtSVG);

function downloadStringArtSVG() {
  const svgData = stringartSvg.outerHTML;
  const preface = '<?xml version="1.0" standalone="no"?>\r\n';
  const svgBlob = new Blob([preface, svgData], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = "stringart.svg";
  downloadLink.click();
}

// Style control changes
colorPicker.addEventListener("change", updateStringArtStyle);
thicknessInput.addEventListener("input", updateStringArtStyle);

function handleImageFile(file) {
  // Read file as ArrayBuffer to get raw bytes
  const reader = new FileReader();
  reader.onload = (e) => {
    currentFileData = new Uint8Array(e.target.result);
    displayOriginalImage(file);
  };
  reader.readAsArrayBuffer(file);
}

function displayOriginalImage(file) {
  // Create object URL for display
  const url = URL.createObjectURL(file);
  originalImage.src = url;

  originalImage.onload = () => {
    uploadArea.classList.add("has-image");
    originalImage.classList.remove("hidden");
    generateButton.disabled = false;

    // Clean up object URL
    URL.revokeObjectURL(url);
  };
}

async function generateStringArt() {
  if (!currentFileData || !wasmInitialized) {
    alert("Please upload an image first and wait for initialization.");
    return;
  }

  generateButton.disabled = true;
  downloadButton.disabled = true;
  loadingOverlay.classList.add("active");

  try {
    const numLines = parseInt(linesInput.value);
    const numPoints = parseInt(pointsInput.value);
    const weight = parseInt(weightInput.value);

    // Add small delay to show loading animation
    setTimeout(async () => {
      try {
        currentStringArtData = generate_stringart(
          currentFileData,
          numPoints,
          numLines,
          weight,
        );

        displayStringArt();
        downloadButton.disabled = false;
      } catch (error) {
        console.error("Error generating string art:", error);
        alert(
          "Error generating string art. Please try with different parameters or a different file.",
        );
      } finally {
        loadingOverlay.classList.remove("active");
        generateButton.disabled = false;
      }
    }, 100);
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
    loadingOverlay.classList.remove("active");
    generateButton.disabled = false;
  }
}

function displayStringArt() {
  if (!currentStringArtData || !Array.isArray(currentStringArtData)) {
    console.error("Invalid string art data");
    return;
  }

  // Get image dimensions to set SVG viewBox
  const imgNaturalWidth = originalImage.naturalWidth;
  const imgNaturalHeight = originalImage.naturalHeight;

  // Create SVG
  stringartSvg.innerHTML = "";
  stringartSvg.setAttribute(
    "viewBox",
    `0 0 ${imgNaturalWidth} ${imgNaturalHeight}`,
  );
  stringartSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Add lines to SVG
  const color = colorPicker.value;
  const thickness = parseFloat(thicknessInput.value);

  currentStringArtData.forEach((line) => {
    if (Array.isArray(line) && line.length >= 2) {
      const [start, end] = line;
      if (
        Array.isArray(start) &&
        Array.isArray(end) &&
        start.length >= 2 &&
        end.length >= 2
      ) {
        const lineElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        lineElement.setAttribute("x1", start[0]);
        lineElement.setAttribute("y1", start[1]);
        lineElement.setAttribute("x2", end[0]);
        lineElement.setAttribute("y2", end[1]);
        lineElement.setAttribute("stroke", color);
        lineElement.setAttribute("stroke-width", thickness);
        lineElement.setAttribute("stroke-linecap", "round");

        stringartSvg.appendChild(lineElement);
      }
    }
  });

  stringartPlaceholder.classList.add("hidden");
  stringartSvg.classList.remove("hidden");
}

function updateStringArtStyle() {
  if (!currentStringArtData) return;

  const color = colorPicker.value;
  const thickness = parseFloat(thicknessInput.value);

  const lines = stringartSvg.querySelectorAll("line");
  lines.forEach((line) => {
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", thickness);
  });
}
