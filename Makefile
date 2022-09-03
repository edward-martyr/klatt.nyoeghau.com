rsync:
	rsync -vhra . "yuanhaoc@ftp.yuanhao-chen.host.dartmouth.edu:/home/yuanhaoc/klatt.nyoeghau.com" --include='**.gitignore' --exclude='/.git' --filter=':- .gitignore' --delete-after