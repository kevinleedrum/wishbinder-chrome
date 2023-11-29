let retryTimeout: number | null = null;
let retries = 0;
const MAX_RETRIES = 30; // 6 seconds

export interface WishData {
  description: string;
  price: string;
  images: string[];
  url: string;
}

const DEFAULT_SERVER_URL = "https://wishbinder.com";

document.addEventListener("DOMContentLoaded", async function onLoad() {
  await setServerUrlValue();

  const refreshButton = document.getElementById("refreshButton")!;
  refreshButton.addEventListener("click", () => window.location.reload());

  const settingsButton = document.getElementById("settingsButton")!;
  settingsButton.addEventListener("click", () => toggleSettings(true));

  const wishForm = document.getElementById("wishForm")! as HTMLFormElement;
  wishForm.addEventListener("submit", onWishFormSubmit);

  const settingsForm = document.getElementById(
    "settingsForm"
  )! as HTMLFormElement;
  settingsForm.addEventListener("submit", onSettingsFormSubmit);

  await getData();
});

function toggleSettings(showSettings = false) {
  const settingsForm = document.getElementById("settingsForm")!;
  settingsForm.style.display = showSettings ? "grid" : "none";
  const wishForm = document.getElementById("wishForm")!;
  wishForm.style.display = showSettings ? "none" : "grid";
}

function onSettingsFormSubmit(e: SubmitEvent) {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  const serverUrl = formData.get("serverUrl") as string;
  chrome.storage.sync.set({ serverUrl });
  toggleSettings();
}

async function getData() {
  if (retryTimeout) clearTimeout(retryTimeout);
  const loading = document.getElementById("loading")!;
  loading.style.display = "grid";
  try {
    const activeTabId = await getActiveTabId();
    if (activeTabId) {
      const response = await chrome.tabs.sendMessage(activeTabId, "getData");
      populateForm(response);
    }
    loading.style.display = "none";
  } catch (e) {
    retries++;
    if (retries <= MAX_RETRIES) {
      retryTimeout = setTimeout(getData, 200);
      return;
    }
    loading.style.display = "none";
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab?.id;
}

async function setServerUrlValue() {
  const { serverUrl } = await chrome.storage.sync.get("serverUrl");
  const serverUrlInput = document.getElementsByName(
    "serverUrl"
  )[0] as HTMLInputElement;
  serverUrlInput.value = serverUrl || DEFAULT_SERVER_URL;
}

async function onWishFormSubmit(e: SubmitEvent) {
  e.preventDefault();
  const { serverUrl } = await chrome.storage.sync.get("serverUrl");

  const formData = new FormData(e.target as HTMLFormElement);
  const description = formData.get("description") as string;
  const price = formData.get("price") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const url = formData.get("url") as string;

  let newTabUrl = new URL(serverUrl + "/wishes");
  newTabUrl.searchParams.set("price", price);
  newTabUrl.searchParams.set("description", description);
  newTabUrl.searchParams.set("imageUrl", imageUrl);
  newTabUrl.searchParams.set("url", url);
  window.open(newTabUrl, "_blank");
}

function populateForm(data: WishData) {
  if (!data) return;

  const form = document.getElementById("wishForm")! as HTMLFormElement;
  form.reset();
  (form.elements.namedItem("description")! as HTMLInputElement).value =
    data.description || "";
  (form.elements.namedItem("price")! as HTMLInputElement).value =
    data.price || "";
  (form.elements.namedItem("url")! as HTMLInputElement).value = data.url || "";

  addImageOptions(data.images);
}

function addImageOptions(images: string[]) {
  const imageContainer = document.getElementById("imageSelection")!;
  imageContainer.innerHTML = "";
  images.forEach((imageUrl: string, index: number) => {
    const label = document.createElement("label");
    const checked = index === 0 ? "checked" : "";
    label.innerHTML = `
      <input type="radio" name="imageUrl" value="${imageUrl}" ${checked}>
      <img src="${imageUrl}" />
    `;
    imageContainer.appendChild(label);
  });
}
