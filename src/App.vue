<template>
  <div id="app">
    <!-- HEADER -->
    <header class="init" style="-webkit-app-region: drag">
      <div class="title">
        <img src="./assets/icon_mini.png" />
        AmongUs Mod Handler {{ version }}
      </div>
      <div
        class="about mr-1"
        @click="linkTo('https://github.com/393mats/amongus-mod-handler')"
      >
        <font-awesome-icon
          icon="question-circle"
          size="lg"
          style="-webkit-app-region: no-drag"
        />
      </div>
      <div id="close" style="-webkit-app-region: no-drag" @click="close">
        <font-awesome-icon
          icon="times-circle"
          size="lg"
          style="-webkit-app-region: no-drag"
        />
      </div>
    </header>
    <div class="row3c">
      <div class="label">プラットフォーム</div>
      <b-form-select
        class="input b-form-select"
        v-model="platform"
        :options="PLATFORM_LIST"
        size="sm"
        @change="changedPlatform"
        :disabled="disabledPlatform"
      ></b-form-select>
    </div>
    <div class="row3c mt-4">
      <div class="label">インストール先</div>
      <b-form-input
        class="input"
        v-model="gamepath"
        placeholder=".../AmongUs"
        size="sm"
        :disabled="disabledPathComp"
        @blur="changedGamePath"
      ></b-form-input>
      <b-button
        class="btn"
        variant="outline-light"
        size="sm"
        :disabled="disabledPathComp"
        @click="openFolder"
      >
        <font-awesome-icon icon="folder-open" size="lg" />
      </b-button>
    </div>
    <fieldset class="mod mt-4 mb-4">
      <legend>Mod</legend>
      <div class="mod-radio">
        <b-form-radio
          class="mod-radio-item"
          v-model="selected"
          name="mod-radios"
          value="vanilla"
          @change="modActive"
          :disabled="disabledRadios"
          >Vanilla</b-form-radio
        >
        <b-form-radio
          class="mod-radio-item"
          v-model="selected"
          name="mod-radios"
          value="tor"
          @change="modActive"
          :disabled="disabledRadios"
          >The Other Roles</b-form-radio
        >
        <b-form-radio
          class="mod-radio-item"
          v-model="selected"
          name="mod-radios"
          value="torgm"
          @change="modActive"
          :disabled="disabledRadios"
          >The Other Roles GM Edition</b-form-radio
        >
      </div>
    </fieldset>
    <b-button
      class="btn"
      variant="outline-light"
      size="sm"
      :disabled="disabledSwitch || disabledRadios"
      @click="switchMod"
      >切替</b-button
    >
    <b-button
      class="btn ml-2"
      variant="outline-light"
      size="sm"
      :disabled="disabledDownload || disabledRadios"
      @click="downloadMod"
      >最新版をDL</b-button
    >
    <b-button
      class="btn ml-2"
      variant="outline-light"
      size="sm"
      :disabled="disabledDelete || disabledRadios"
      @click="deleteMod"
      >削除</b-button
    >
    <b-button
      class="btn ml-2"
      style="float: right"
      variant="outline-warning"
      size="sm"
      :disabled="!platform"
      @click="launchGame"
      >AmongUsを起動</b-button
    >
    <div class="cover" v-if="showProgress">
      <b-spinner variant="light" style="width: 3rem; height: 3rem"></b-spinner>
    </div>

    <b-toast
      id="switched"
      variant="info"
      toaster="b-toaster-bottom-center"
      :auto-hide-delay="1000"
      :no-hover-pause="true"
      :no-close-button="true"
      solid
    >
      Modの切替が完了しました
    </b-toast>

    <b-toast
      id="downloaded"
      variant="info"
      toaster="b-toaster-bottom-center"
      :auto-hide-delay="1000"
      :no-hover-pause="true"
      :no-close-button="true"
      solid
    >
      Modのダウンロードが完了しました
    </b-toast>

    <b-toast
      id="deleted"
      variant="info"
      toaster="b-toaster-bottom-center"
      :auto-hide-delay="1000"
      :no-hover-pause="true"
      :no-close-button="true"
      solid
    >
      Modの削除が完了しました
    </b-toast>
    <b-toast
      id="launch"
      variant="success"
      toaster="b-toaster-bottom-center"
      :auto-hide-delay="3000"
      :no-hover-pause="true"
      :no-close-button="true"
      solid
    >
      ゲームを開いています...
    </b-toast>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
const PLATFORM_OBJ = [
  {
    value: "STEAM",
    text: "Steam",
  },
  {
    value: "EPIC",
    text: "Epic",
  },
];
export default {
  name: "App",
  components: {
    //
  },
  data() {
    return {
      version: "v1",
      // w: remote.getCurrentWindow(),
      platform: null,
      gamepath: null,
      selected: null,

      disabledPlatform: false,
      disabledPathComp: true,
      disabledRadios: true,
      disabledSwitch: true,
      disabledDownload: true,
      disabledDelete: true,

      showProgress: false,
      PLATFORM_LIST: [...PLATFORM_OBJ],
    };
  },
  methods: {
    close() {
      ipcRenderer.invoke("close", null);
    },
    linkTo(str) {
      ipcRenderer.invoke("link-to", str);
    },
    async changedPlatform() {
      this.disabledPlatform = true;
      const { found, location } = await ipcRenderer.invoke(
        "search-directory",
        this.platform
      );
      if (found) {
        this.gamepath = location;
        this.disabledPathComp = true;
        this.disabledRadios = false;
        this.modActive();
        await ipcRenderer.invoke("ini-save", this.platform, this.gamepath);
      } else {
        await ipcRenderer.invoke(
          "error-dialog",
          "Directory Not Found",
          "AmongUsのインストールフォルダが見つかりませんでした\n手動でパスを設定してください"
        );
        this.selected = null;
        this.disabledPathComp = false;
        this.disabledRadios = true;
        this.disabledSwitch = true;
        this.disabledDownload = true;
        this.disabledDelete = true;
        this.gamepath = "";
      }
      this.disabledPlatform = false;
    },
    async openFolder() {
      const { canceled, filePaths } = await ipcRenderer.invoke(
        "open-directory",
        null
      );
      if (canceled) return;
      this.gamepath = filePaths[0];
      this.checkExe();
    },
    async checkExe(save = true) {
      const result = await ipcRenderer.invoke("check-exe", this.gamepath);
      if (result) {
        this.disabledRadios = false;
        if (save) {
          await ipcRenderer.invoke("ini-save", this.platform, this.gamepath);
        }
      } else {
        this.disabledRadios = true;
      }
      this.selected = null;
      this.modActive();
    },
    changedGamePath() {
      this.checkExe();
    },
    async modActive() {
      if (!this.selected) return;
      this.disabledSwitch = true;
      this.disabledDownload = true;
      this.disabledDelete = true;
      if (this.selected === "vanilla") {
        this.disabledSwitch = false;
        this.disabledDownload = true;
      } else {
        this.disabledDownload = false;
        const r = await ipcRenderer.invoke(
          "handler-check",
          this.gamepath,
          this.selected
        );
        if (r) {
          this.disabledSwitch = false;
          this.disabledDelete = false;
        }
      }
    },
    async switchMod() {
      let completed = false;
      this.showProgress = true;
      if (this.selected === "vanilla") {
        completed = await ipcRenderer.invoke(
          "handler-set-v",
          this.gamepath,
          true
        );
      } else {
        completed = await ipcRenderer.invoke(
          "handler-set-v",
          this.gamepath,
          true
        );
        completed = await ipcRenderer.invoke(
          "handler-set-m",
          this.gamepath,
          this.selected
        );
      }
      this.showProgress = false;
      if (completed) this.$bvToast.show("switched");
      else {
        await ipcRenderer.invoke(
          "error-dialog",
          "Error",
          "Modの切替に失敗しました"
        );
      }
    },
    async deleteMod() {
      this.showProgress = true;
      const r = await ipcRenderer.invoke(
        "handler-delete",
        this.gamepath,
        this.selected
      );
      this.showProgress = false;
      if (r) this.$bvToast.show("deleted");
      else {
        await ipcRenderer.invoke(
          "error-dialog",
          "Error",
          "Modの削除に失敗しました\nゲームフォルダの書き込み権限等を確認してください"
        );
      }
      this.modActive();
    },
    async downloadMod() {
      this.showProgress = true;
      const r = await ipcRenderer.invoke(
        "handler-download",
        this.gamepath,
        this.selected
      );
      this.showProgress = false;
      if (r) this.$bvToast.show("downloaded");
      else {
        await ipcRenderer.invoke(
          "error-dialog",
          "Error",
          "Modのダウンロードに失敗しました\nインターネット環境とゲームフォルダの書き込み権限等を確認してください"
        );
      }
      this.modActive();
    },
    async launchGame() {
      await ipcRenderer.invoke("launch-game", this.platform);
      this.$bvToast.show("launch");
    },
  },
  created() {
    this.$nextTick(async () => {
      const DEFAULT_DATA = await ipcRenderer.invoke("ini-get", null);
      if (Object.hasOwnProperty.call(DEFAULT_DATA, "platform")) {
        this.platform = DEFAULT_DATA.platform;
      }
      if (Object.hasOwnProperty.call(DEFAULT_DATA, "location")) {
        this.gamepath = DEFAULT_DATA.location;
        this.checkExe(false);
      }
    });
  },
};
</script>

<style lang="scss">
#app {
  position: relative;
  width: 100%;
  height: 100vh;
  border: solid 4px #212121;
  background: #424242;
  color: #fafafa;
  padding: 8px;
  padding-top: 40px;
  font-size: 12px;
}
header.init {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 32px;
  padding: 0 5px;
  background: #212121;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  font-size: 16px;

  .title {
    color: #fafafa;
    width: 100%;
    flex-flow: 1;
    flex-shrink: 1;
    -webkit-user-select: none;
  }
  .about {
    flex-flow: 0;
    flex-shrink: 0;
    color: #fafafa;
    &:hover {
      opacity: 0.8;
    }
  }
  #close {
    flex-flow: 0;
    flex-shrink: 0;
    color: #ef6c00;
    &:hover {
      color: #ff8a65;
    }
  }
}

.row3c {
  width: 100%;
  display: flex;
  align-items: center;
  .label {
    width: 120px;
    flex-flow: 0;
    flex-shrink: 0;
    -webkit-user-select: none;
  }
  .input {
    width: 100%;
    flex-flow: 1;
    flex-shrink: 1;
  }
  .btn {
    width: 50px;
    flex-flow: 0;
    flex-shrink: 0;
    margin-left: 8px;
  }
}

fieldset.mod {
  font-size: 12px;
  border: 1px #fafafa solid;
  box-sizing: content-box;
  padding: 8px;
  legend {
    width: auto;
    padding-left: 8px;
    padding-right: 8px;
    font-size: 14px;
    -webkit-user-select: none;
  }
  .mod-radio {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    &-item {
      margin-right: 15px;
      margin-bottom: 8px;
      font-size: 14px;
      -webkit-user-select: none;
    }
  }
}
.cover {
  position: absolute;
  top: 32px;
  left: 0;
  width: 100%;
  height: calc(100% - 32px);
  background: #212121;
  opacity: 0.5;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
