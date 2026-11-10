# Template for Gitguy268/homebrew-tap Formula/openfinder.rb. Fill in SHA256_SOURCE from the
# tag tarball after tagging.
class Openfinder < Formula
  desc "Finder-style file library in the browser, served on localhost"
  homepage "https://github.com/Gitguy268/openfinder"
  url "https://github.com/Gitguy268/openfinder/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "SHA256_SOURCE"
  license "GPL-3.0-or-later"
  head "https://github.com/Gitguy268/openfinder.git", branch: "main"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args(prefix: false)
    system "npm", "run", "build"
    libexec.install "bin", "dist", "package.json", "LICENSE", "THIRD_PARTY_NOTICES.md"
    (bin/"openfinder").write <<~SH
      #!/bin/sh
      exec "#{formula_opt_bin("node")}/node" "#{libexec}/bin/openfinder.mjs" "$@"
    SH
  end

  def caveats
    <<~EOS
      Run `openfinder --open`, or `openfinder` and open http://localhost:4627/
      Use a Chromium browser (Chrome, Edge, Brave, Opera, Arc) to work with folders.
    EOS
  end

  test do
    port = free_port
    pid = spawn bin/"openfinder", "--port", port.to_s
    sleep 3
    assert_match "<html", shell_output("curl -s http://127.0.0.1:#{port}/")
  ensure
    Process.kill("TERM", pid) if pid
    Process.wait(pid) if pid
  end
end
