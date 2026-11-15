# Sun, Earth, and Moon

網頁開啟時自動顯示當天 UTC 00:00 的模擬。播放、日期和視角由各自的瀏覽器控制。後端使用原始程式中的 Skyfield 計算，前端以 Canvas 呈現可旋轉的投影圖。

## 在 Mac 預覽

在這個資料夾執行 `pipenv sync`，再執行 `pipenv run flask --app app run`。開啟 http://127.0.0.1:5000 。已有 `de440.bsp` 的話，可以複製到 `app.py` 旁邊，省去首次下載。

## 取得評審可開啟的網址

1. 把這個資料夾裡的內容放到 GitHub repo 根目錄。確認 `render.yaml` 和 `app.py` 在同一層，且沒有追蹤 `de440.bsp`。
2. 在 Render 選 **New → Blueprint**，連接該 repo，確認部署設定。建置時會用 Pipenv 安裝套件，並由 Skyfield 下載 DE440。
3. 部署完成後，在無痕視窗打開 Render 提供的網址。確認模擬能自動載入，再把這個網址交給評審。

提交隨附的 `Pipfile.lock` 來固定相依套件版本。DE440 下載失敗時，請檢查主機建置日誌。Render 的免費服務可能需要等待冷啟動。
