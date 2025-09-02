class AvatarManager {
  baseUrl: string;
  avatarCount: number;
  selectedAvatar: any;

  constructor() {
    this.baseUrl = "https://the99.b-cdn.net/avatar/noavatar/";
    this.avatarCount = 6; // 1-6 arası avatar var
    this.selectedAvatar = null;
  }

  // Random avatar ID yarat (1-6)
  getRandomAvatarId() {
    return Math.floor(Math.random() * this.avatarCount) + 1;
  }

  // Avatar URL-ni yarat
  getAvatarUrl(avatarId: number) {
    return `${this.baseUrl}avatar_${avatarId}.jpg`;
  }

  // Random avatar seç
  selectRandomAvatar() {
    const avatarId = this.getRandomAvatarId();
    this.selectedAvatar = {
      id: avatarId,
      url: this.getAvatarUrl(avatarId),
    };
    return this.selectedAvatar;
  }

  // Bütün avatarları əldə et
  getAllAvatars() {
    const avatars = [];
    for (let i = 1; i <= this.avatarCount; i++) {
      avatars.push({
        id: i,
        url: this.getAvatarUrl(i),
      });
    }
    return avatars;
  }

  // Avatar seçim interfeysi yaradır
  createAvatarSelector(containerId: string, onAvatarSelected = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const avatars = this.getAllAvatars();

    container.innerHTML = `
            <div class="avatar-selector">
                <h4>Avatar seçin:</h4>
                <div class="avatar-grid">
                    ${avatars
                      .map(
                        (avatar) => `
                        <div class="avatar-option" data-avatar-id="${avatar.id}">
                            <img src="${avatar.url}" alt="Avatar ${avatar.id}" 
                                 onerror="this.style.display='none'">
                            <input type="radio" name="avatar" value="${avatar.id}" 
                                   id="avatar_${avatar.id}">
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <button type="button" id="randomAvatarBtn">Random Seç</button>
                <div class="selected-avatar-preview">
                    <h5>Seçilmiş Avatar:</h5>
                    <img id="selectedAvatarPreview" src="" alt="Seçilmiş avatar" style="display:none;">
                </div>
            </div>
        `;

    // Event listeners
    this.setupAvatarEvents(containerId, onAvatarSelected);

    // İlk dəfə random avatar seç
    this.selectRandomAvatarInUI(containerId);
  }

  // Avatar event-lərini qur
  setupAvatarEvents(
    containerId: string,
    callback: (arg0: string, arg1: any) => void
  ) {
    const container = document.getElementById(containerId);

    // Avatar seçim event-i
    container.addEventListener("click", (e: any) => {
      if (e.target.closest(".avatar-option")) {
        const avatarId = e.target.closest(".avatar-option").dataset.avatarId;
        this.selectAvatarInUI(containerId, avatarId);
        if (callback) callback(this.getAvatarUrl(avatarId), avatarId);
      }
    });

    // Random button event-i
    const randomBtn = container.querySelector("#randomAvatarBtn");
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        this.selectRandomAvatarInUI(containerId);
        if (callback) callback(this.selectedAvatar.url, this.selectedAvatar.id);
      });
    }
  }

  // UI-da avatar seç
  selectAvatarInUI(containerId: string, avatarId: any) {
    const container: any = document.getElementById(containerId);
    const radio: any = container.querySelector(`#avatar_${avatarId}`);
    const preview: any = container.querySelector("#selectedAvatarPreview");

    if (radio) {
      radio.checked = true;
      this.selectedAvatar = {
        id: avatarId,
        url: this.getAvatarUrl(avatarId),
      };

      // Preview göstər
      if (preview) {
        preview.src = this.selectedAvatar.url;
        preview.style.display = "block";
      }

      // Aktiv class əlavə et
      container
        .querySelectorAll(".avatar-option")
        .forEach((opt) => opt.classList.remove("active"));
      container
        .querySelector(`[data-avatar-id="${avatarId}"]`)
        ?.classList.add("active");
    }
  }

  // Random avatar seç UI-da
  selectRandomAvatarInUI(containerId: any) {
    const randomAvatar = this.selectRandomAvatar();
    this.selectAvatarInUI(containerId, randomAvatar.id);
  }

  // Seçilmiş avatar məlumatını al
  getSelectedAvatar() {
    return this.selectedAvatar;
  }

  // Avatar preload et (performance üçün)
  preloadAvatars() {
    const avatars = this.getAllAvatars();
    avatars.forEach((avatar) => {
      const img = new Image();
      img.src = avatar.url;
    });
  }
}

export default AvatarManager;
