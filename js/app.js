(function () {
  'use strict';

  // ========== Firebase ==========
  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var storage = firebase.storage();

  var projectsRef = db.collection('projects');
  var qnaRef = db.collection('qna');

  // ========== DOM ==========
  var darkModeToggle = document.getElementById('dark-mode-toggle');
  var sidebarBrand = document.querySelector('.sidebar-brand');
  var navLinks = document.querySelectorAll('.sidebar .nav-link[data-section]');
  var sections = document.querySelectorAll('.section-page');
  var iconSun = document.querySelector('.icon-sun');
  var iconMoon = document.querySelector('.icon-moon');
  var adminEntryBtn = document.getElementById('admin-entry-btn');
  var adminModal = document.getElementById('admin-modal');
  var adminForm = document.getElementById('admin-form');
  var adminPassword = document.getElementById('admin-password');
  var adminError = document.getElementById('admin-error');
  var projectsList = document.getElementById('projects-list');
  var projectsSkeleton = document.getElementById('projects-skeleton');
  var projectModal = document.getElementById('project-modal');
  var projectDetailBody = document.getElementById('project-detail-body');
  var projectFormModal = document.getElementById('project-form-modal');
  var projectForm = document.getElementById('project-form');
  var projectFormTitle = document.getElementById('project-form-title');
  var projectAddBtn = document.getElementById('project-add-btn');
  var qnaForm = document.getElementById('qna-form');
  var qnaList = document.getElementById('qna-list');
  var qnaSkeleton = document.getElementById('qna-skeleton');
  var qnaModal = document.getElementById('qna-modal');
  var qnaModalBody = document.getElementById('qna-modal-body');
  var weatherCity = document.getElementById('weather-city');
  var weatherBtn = document.getElementById('weather-btn');
  var weatherContent = document.getElementById('weather-content');
  var weatherLocation = document.getElementById('weather-location');
  var weatherDate = document.getElementById('weather-date');
  var weatherIcon = document.getElementById('weather-icon');
  var weatherTemp = document.getElementById('weather-temp');
  var weatherError = document.getElementById('weather-error');

  // ========== 관리자 모드 ==========
  function isAdmin() {
    return sessionStorage.getItem('admin') === 'true';
  }
  function setAdmin(value) {
    if (value) sessionStorage.setItem('admin', 'true');
    else sessionStorage.removeItem('admin');
    document.body.classList.toggle('admin-mode', value);
  }
  function openAdminModal() {
    adminError.classList.add('hidden');
    adminPassword.value = '';
    adminModal.classList.remove('hidden');
  }
  function closeAdminModal() {
    adminModal.classList.add('hidden');
  }
  adminEntryBtn.addEventListener('click', function () {
    if (isAdmin()) {
      setAdmin(false);
      adminEntryBtn.textContent = '관리자';
      return;
    }
    openAdminModal();
  });
  adminForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var pwd = adminPassword.value.trim();
    if (pwd === ADMIN_PASSWORD) {
      setAdmin(true);
      adminEntryBtn.textContent = '관리자 로그아웃';
      closeAdminModal();
    } else {
      adminError.textContent = '비밀번호가 올바르지 않습니다.';
      adminError.classList.remove('hidden');
    }
  });
  document.querySelectorAll('.admin-modal-close').forEach(function (el) {
    el.addEventListener('click', closeAdminModal);
  });
  if (isAdmin()) {
    setAdmin(true);
    adminEntryBtn.textContent = '관리자 로그아웃';
  }

  // ========== 다크 모드 ==========
  function loadDarkMode() {
    var saved = localStorage.getItem('darkMode');
    var isDark = saved === null ? true : saved === 'true';
    document.body.classList.toggle('light-mode', !isDark);
    iconSun.classList.toggle('hidden', !isDark);
    iconMoon.classList.toggle('hidden', isDark);
  }
  darkModeToggle.addEventListener('click', function () {
    var isLight = document.body.classList.contains('light-mode');
    document.body.classList.toggle('light-mode', !isLight);
    localStorage.setItem('darkMode', (!isLight).toString());
    iconSun.classList.toggle('hidden', isLight);
    iconMoon.classList.toggle('hidden', !isLight);
  });
  loadDarkMode();

  // ========== 메뉴 클릭 시 섹션 전환 (스크롤 없음) ==========
  function showSection(sectionId) {
    sections.forEach(function (section) {
      section.classList.toggle('section-active', section.id === sectionId);
    });
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
    });
  }
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var sectionId = link.getAttribute('data-section');
      showSection(sectionId);
    });
  });
  if (sidebarBrand) {
    sidebarBrand.addEventListener('click', function (e) {
      e.preventDefault();
      showSection('intro');
    });
  }

  // ========== 프로젝트 목록 ==========
  var projectImagesToUpload = [];
  var projectExistingImageUrls = [];
  function renderProjectCard(doc) {
    var data = doc.data();
    var id = doc.id;
    if (data.draft === true && !isAdmin()) return '';
    var typeClass = data.type === '팀' ? 'team' : '';
    var tech = (data.tech || []).join ? data.tech : (data.tech || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var tags = Array.isArray(tech) ? tech : [];
    var tagsHtml = tags.map(function (t) { return '<span class="project-tag">' + escapeHtml(t) + '</span>'; }).join('');
    var images = data.images && Array.isArray(data.images) ? data.images : [];
    var thumbHtml = images.length
      ? '<img class="project-card-thumb" src="' + escapeHtml(images[0]) + '" alt="">'
      : '';
    var cardClass = 'project-card' + (images.length ? ' has-thumb' : '');
    return (
      '<article class="' + cardClass + '" data-id="' + escapeHtml(id) + '">' +
        thumbHtml +
        '<div class="project-card-body">' +
          '<h3>' + escapeHtml(data.title || '') + '</h3>' +
          '<p class="summary">' + escapeHtml(data.summary || '') + '</p>' +
          (tagsHtml ? '<div class="project-tags">' + tagsHtml + '</div>' : '') +
          '<p class="project-type ' + typeClass + '">' + escapeHtml(data.type || '개인') + '</p>' +
        '</div>' +
      '</article>'
    );
  }
  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function fetchProjects() {
    projectsRef.get()
      .then(function (snap) {
        projectsSkeleton.classList.add('hidden');
        var docs = snap.docs.slice();
        docs.sort(function (a, b) {
          var oa = a.data().order != null ? a.data().order : 0;
          var ob = b.data().order != null ? b.data().order : 0;
          if (oa !== ob) return oa - ob;
          var ta = a.data().createdAt && a.data().createdAt.toDate ? a.data().createdAt.toDate().getTime() : 0;
          var tb = b.data().createdAt && b.data().createdAt.toDate ? b.data().createdAt.toDate().getTime() : 0;
          return tb - ta;
        });
        var html = '';
        docs.forEach(function (doc) {
          html += renderProjectCard(doc);
        });
        if (!html) html = '<p class="text-caption">등록된 프로젝트가 없습니다.</p>';
        projectsList.innerHTML = html;
        projectsList.querySelectorAll('.project-card').forEach(function (card) {
          card.addEventListener('click', function () {
            openProjectDetail(card.getAttribute('data-id'));
          });
        });
      })
      .catch(function (err) {
        projectsSkeleton.classList.add('hidden');
        projectsList.innerHTML = '<p class="form-error">프로젝트를 불러오지 못했습니다.</p>';
        console.error(err);
      });
  }
  fetchProjects();

  // ========== 프로젝트 상세 ==========
  function openProjectDetail(id) {
    projectsRef.doc(id).get().then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data();
      var tech = (d.tech || []).join ? d.tech : (d.tech || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      var images = (d.images && Array.isArray(d.images)) ? d.images : [];
      var tags = (d.tags && Array.isArray(d.tags)) ? d.tags : (d.tags ? String(d.tags).split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []);
      var html = '';
      html += '<h3>' + escapeHtml(d.title || '') + '</h3>';
      html += '<p><strong>요약</strong> ' + escapeHtml(d.summary || '') + '</p>';
      html += '<p><strong>유형</strong> ' + escapeHtml(d.type || '개인') + '</p>';
      if (d.period) html += '<p><strong>개발 기간</strong> ' + escapeHtml(d.period) + '</p>';
      if (tech.length) html += '<p><strong>기술</strong> ' + escapeHtml(tech.join(', ')) + '</p>';
      if (tags.length) html += '<p><strong>태그</strong> ' + escapeHtml(tags.join(', ')) + '</p>';
      if (images.length) {
        html += '<div class="project-detail-gallery">';
        images.forEach(function (url) {
          html += '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener"><img src="' + escapeHtml(url) + '" alt=""></a>';
        });
        html += '</div>';
      }
      html += '<h3>프로젝트 설명</h3><p>' + (escapeHtml(d.description || '').replace(/\n/g, '<br>')) + '</p>';
      if (d.role) html += '<h3>담당 역할</h3><p>' + (escapeHtml(d.role || '').replace(/\n/g, '<br>')) + '</p>';
      if (d.problem) html += '<h3>문제 및 해결 과정</h3><p>' + (escapeHtml(d.problem || '').replace(/\n/g, '<br>')) + '</p>';
      if (d.result) html += '<h3>결과 / 배운 점</h3><p>' + (escapeHtml(d.result || '').replace(/\n/g, '<br>')) + '</p>';
      if (d.github) html += '<p><a href="' + escapeHtml(d.github) + '" target="_blank" rel="noopener">GitHub</a></p>';
      if (d.video) html += '<p><a href="' + escapeHtml(d.video) + '" target="_blank" rel="noopener">영상</a></p>';
      if (isAdmin()) {
        html += '<div class="form-actions" style="margin-top:20px">' +
          '<button type="button" class="btn btn-ghost project-edit-btn" data-id="' + escapeHtml(id) + '">수정</button>' +
          '<button type="button" class="btn btn-ghost project-delete-btn" data-id="' + escapeHtml(id) + '">삭제</button>' +
        '</div>';
      }
      projectDetailBody.innerHTML = html;
      projectModal.classList.remove('hidden');
      if (isAdmin()) {
        projectDetailBody.querySelector('.project-edit-btn').addEventListener('click', function () {
          closeProjectModal();
          openProjectForm(id);
        });
        projectDetailBody.querySelector('.project-delete-btn').addEventListener('click', function () {
          if (confirm('이 프로젝트를 삭제할까요?')) {
            projectsRef.doc(id).delete().then(function () { closeProjectModal(); fetchProjects(); }).catch(function (err) { alert('삭제에 실패했습니다.'); });
          }
        });
      }
    });
  }
  function closeProjectModal() {
    projectModal.classList.add('hidden');
  }
  projectModal.querySelector('.modal-backdrop').addEventListener('click', closeProjectModal);
  projectModal.querySelector('.modal-close').addEventListener('click', closeProjectModal);

  // ========== 프로젝트 폼 (추가/수정) ==========
  function renderProjectImagesPreview() {
    var container = document.getElementById('project-images-preview');
    if (!container) return;
    container.innerHTML = '';
    projectExistingImageUrls.forEach(function (url, i) {
      var div = document.createElement('div');
      div.className = 'project-images-preview-item';
      div.innerHTML = '<img src="' + escapeHtml(url) + '" alt=""><button type="button">×</button>';
      (function (idx) {
        div.querySelector('button').addEventListener('click', function () {
          projectExistingImageUrls.splice(idx, 1);
          renderProjectImagesPreview();
        });
      })(i);
      container.appendChild(div);
    });
    projectImagesToUpload.forEach(function (file, i) {
      var div = document.createElement('div');
      div.className = 'project-images-preview-item';
      var url = URL.createObjectURL(file);
      div.innerHTML = '<img src="' + url + '" alt=""><button type="button">×</button>';
      (function (objUrl, idx) {
        div.querySelector('button').addEventListener('click', function () {
          URL.revokeObjectURL(objUrl);
          projectImagesToUpload.splice(idx, 1);
          renderProjectImagesPreview();
        });
      })(url, i);
      container.appendChild(div);
    });
  }
  function openProjectForm(id) {
    var isEdit = !!id;
    projectFormTitle.textContent = isEdit ? '프로젝트 수정' : '프로젝트 추가';
    document.getElementById('project-id').value = id || '';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = id || '';
    document.getElementById('project-order').value = 0;
    projectImagesToUpload = [];
    projectExistingImageUrls = [];
    renderProjectImagesPreview();
    document.getElementById('project-draft-wrap').style.display = isAdmin() ? 'block' : 'none';
    if (isEdit) {
      projectsRef.doc(id).get().then(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();
        document.getElementById('project-title').value = d.title || '';
        document.getElementById('project-summary').value = d.summary || '';
        document.getElementById('project-type').value = d.type || '개인';
        document.getElementById('project-order').value = d.order != null ? d.order : 0;
        document.getElementById('project-period').value = d.period || '';
        document.getElementById('project-tech').value = Array.isArray(d.tech) ? d.tech.join(', ') : (d.tech || '');
        document.getElementById('project-tags').value = Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || '');
        document.getElementById('project-desc').value = d.description || '';
        document.getElementById('project-role').value = d.role || '';
        document.getElementById('project-problem').value = d.problem || '';
        document.getElementById('project-result').value = d.result || '';
        document.getElementById('project-github').value = d.github || '';
        document.getElementById('project-video').value = d.video || '';
        document.getElementById('project-draft').checked = d.draft === true;
        projectExistingImageUrls = (d.images && Array.isArray(d.images)) ? d.images.slice() : [];
        renderProjectImagesPreview();
        projectFormModal.classList.remove('hidden');
      });
    } else {
      projectFormModal.classList.remove('hidden');
    }
  }
  var projectImagesInput = document.getElementById('project-images-input');
  var projectImagesDropzone = document.getElementById('project-images-dropzone');
  function addImageFiles(files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      if (files[i].type.indexOf('image/') === 0) projectImagesToUpload.push(files[i]);
    }
    if (projectImagesInput) projectImagesInput.value = '';
    renderProjectImagesPreview();
  }
  if (projectImagesDropzone && projectImagesInput) {
    projectImagesDropzone.addEventListener('click', function () { projectImagesInput.click(); });
    projectImagesInput.addEventListener('change', function () {
      addImageFiles(this.files);
    });
    projectImagesDropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      projectImagesDropzone.classList.add('is-dragover');
    });
    projectImagesDropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      projectImagesDropzone.classList.remove('is-dragover');
    });
    projectImagesDropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      projectImagesDropzone.classList.remove('is-dragover');
      addImageFiles(e.dataTransfer.files);
    });
  }
  function closeProjectFormModal() {
    projectFormModal.classList.add('hidden');
  }
  projectAddBtn.addEventListener('click', function () { openProjectForm(null); });
  projectFormModal.querySelectorAll('.form-close').forEach(function (btn) {
    btn.addEventListener('click', closeProjectFormModal);
  });
  projectFormModal.querySelector('.modal-backdrop').addEventListener('click', closeProjectFormModal);
  function uploadProjectImages(projectId, files, callback) {
    if (!files || !files.length) {
        callback([]);
        return;
      }
    var uploaded = 0;
    var urls = [];
    var total = files.length;
    var done = function () {
      if (uploaded === total) callback(urls);
    };
    files.forEach(function (file, i) {
      var baseName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
      var name = Date.now() + '_' + i + '_' + baseName;
      var ref = storage.ref('projects/' + projectId + '/' + name);
      ref.put(file).then(function () {
        return ref.getDownloadURL();
      }).then(function (url) {
        urls.push(url);
        uploaded++;
        done();
      }).catch(function (err) {
        console.error(err);
        uploaded++;
        done();
      });
    });
  }
  var projectSubmitBtn = document.getElementById('project-submit-btn');
  function setProjectFormLoading(loading) {
    if (projectSubmitBtn) {
      projectSubmitBtn.disabled = loading;
      projectSubmitBtn.textContent = loading ? '저장 중…' : '저장';
    }
  }
  projectForm.addEventListener('submit', function (e) {
    e.preventDefault();
    setProjectFormLoading(true);
    var id = document.getElementById('project-id').value.trim();
    var techStr = document.getElementById('project-tech').value.trim();
    var tech = techStr ? techStr.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];
    var tagsStr = document.getElementById('project-tags').value.trim();
    var tags = tagsStr ? tagsStr.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];
    var payload = {
      title: document.getElementById('project-title').value.trim(),
      summary: document.getElementById('project-summary').value.trim(),
      type: document.getElementById('project-type').value,
      order: parseInt(document.getElementById('project-order').value, 10) || 0,
      period: document.getElementById('project-period').value.trim() || null,
      tech: tech,
      tags: tags,
      description: document.getElementById('project-desc').value.trim(),
      role: document.getElementById('project-role').value.trim(),
      problem: document.getElementById('project-problem').value.trim(),
      result: document.getElementById('project-result').value.trim(),
      github: document.getElementById('project-github').value.trim() || null,
      video: document.getElementById('project-video').value.trim() || null,
      draft: document.getElementById('project-draft').checked,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (projectImagesToUpload.length) {
      function doUpload(targetId, callback) {
        uploadProjectImages(targetId, projectImagesToUpload, function (newUrls) {
          callback(projectExistingImageUrls.concat(newUrls));
        });
      }
      if (id) {
        doUpload(id, function (allUrls) {
          payload.images = allUrls;
          delete payload.createdAt;
          projectsRef.doc(id).update(payload).then(function () {
            setProjectFormLoading(false);
            closeProjectFormModal();
            fetchProjects();
          }).catch(function (err) {
            console.error(err);
            setProjectFormLoading(false);
            alert('수정에 실패했습니다. Storage 규칙을 확인해 주세요.');
          });
        });
      } else {
        var newId = projectsRef.doc().id;
        doUpload(newId, function (allUrls) {
          payload.images = allUrls;
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          projectsRef.doc(newId).set(payload).then(function () {
            setProjectFormLoading(false);
            closeProjectFormModal();
            fetchProjects();
          }).catch(function (err) {
            console.error(err);
            setProjectFormLoading(false);
            alert('등록에 실패했습니다. Firebase Console에서 Storage를 활성화하고 규칙을 확인해 주세요.');
          });
        });
      }
    } else {
      payload.images = projectExistingImageUrls;
      if (id) {
        delete payload.createdAt;
        projectsRef.doc(id).update(payload).then(function () {
          setProjectFormLoading(false);
          closeProjectFormModal();
          fetchProjects();
        }).catch(function (err) { console.error(err); setProjectFormLoading(false); alert('수정에 실패했습니다.'); });
      } else {
        projectsRef.add(payload).then(function () {
          setProjectFormLoading(false);
          closeProjectFormModal();
          fetchProjects();
        }).catch(function (err) { console.error(err); setProjectFormLoading(false); alert('등록에 실패했습니다.'); });
      }
    }
  });

  // ========== QnA ==========
  function renderQnaItem(doc) {
    var data = doc.data();
    var id = doc.id;
    var createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
    var dateStr = createdAt.getFullYear() + '-' + String(createdAt.getMonth() + 1).padStart(2, '0') + '-' + String(createdAt.getDate()).padStart(2, '0');
    var answerHtml = '';
    if (data.answer) {
      answerHtml = '<div class="qna-answer-box"><p class="author">정권혁</p><p class="text">' + escapeHtml((data.answer.text || '').replace(/\n/g, '<br>')) + '</p></div>';
    }
    var actionsHtml = '';
    if (isAdmin()) {
      actionsHtml = '<div class="qna-item-actions">' +
        '<button type="button" class="btn btn-ghost qna-answer-btn" data-id="' + escapeHtml(id) + '">답변</button>' +
        '<button type="button" class="btn btn-ghost qna-delete-btn" data-id="' + escapeHtml(id) + '">삭제</button>' +
      '</div>';
    } else {
      actionsHtml = '<div class="qna-item-actions"><button type="button" class="btn btn-ghost qna-delete-btn" data-id="' + escapeHtml(id) + '" data-password="">삭제</button></div>';
    }
    return (
      '<div class="qna-item" data-id="' + escapeHtml(id) + '">' +
        '<div class="qna-item-header">' +
          '<span class="qna-item-name">' + escapeHtml(data.name || '') + '</span>' +
          '<span class="qna-item-date">' + dateStr + '</span>' +
        '</div>' +
        '<div class="qna-item-content">' + escapeHtml((data.content || '').replace(/\n/g, '\n')) + '</div>' +
        answerHtml +
        actionsHtml +
      '</div>'
    );
  }
  function fetchQna() {
    qnaRef.orderBy('createdAt', 'desc').get().then(function (snap) {
      qnaSkeleton.classList.add('hidden');
      var html = '';
      snap.docs.forEach(function (doc) {
        html += renderQnaItem(doc);
      });
      if (!html) html = '<p class="text-caption">아직 질문이 없습니다.</p>';
      qnaList.innerHTML = html;
      qnaList.querySelectorAll('.qna-answer-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openQnaAnswerModal(btn.getAttribute('data-id')); });
      });
      qnaList.querySelectorAll('.qna-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          if (isAdmin()) {
            if (confirm('이 질문을 삭제할까요?')) deleteQna(id);
          } else {
            var pwd = prompt('삭제하려면 비밀번호를 입력하세요.');
            if (pwd !== null) deleteQnaWithPassword(id, pwd);
          }
        });
      });
    }).catch(function (err) {
      qnaSkeleton.classList.add('hidden');
      qnaList.innerHTML = '<p class="form-error">질문 목록을 불러오지 못했습니다.</p>';
      console.error(err);
    });
  }
  function deleteQna(id) {
    qnaRef.doc(id).delete().then(function () { fetchQna(); }).catch(function (err) { console.error(err); alert('삭제에 실패했습니다.'); });
  }
  function deleteQnaWithPassword(id, pwd) {
    qnaRef.doc(id).get().then(function (doc) {
      if (!doc.exists) return;
      if (doc.data().password === pwd) {
        qnaRef.doc(id).delete().then(function () { fetchQna(); }).catch(function (err) { alert('삭제에 실패했습니다.'); });
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    });
  }
  function openQnaAnswerModal(id) {
    qnaRef.doc(id).get().then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data();
      var createdAt = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
      var dateStr = createdAt.getFullYear() + '-' + String(createdAt.getMonth() + 1).padStart(2, '0') + '-' + String(createdAt.getDate()).padStart(2, '0');
      var answerText = (d.answer && d.answer.text) ? d.answer.text : '';
      qnaModalBody.innerHTML =
        '<p><strong>' + escapeHtml(d.name || '') + '</strong> ' + dateStr + '</p>' +
        '<pre class="qna-item-content">' + escapeHtml(d.content || '') + '</pre>' +
        '<div class="form-group">' +
          '<label>답변 (정권혁)</label>' +
          '<textarea id="qna-answer-text" rows="4" placeholder="답변을 입력하세요">' + escapeHtml(answerText) + '</textarea>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn btn-primary" id="qna-save-answer" data-id="' + escapeHtml(id) + '">저장</button>' +
        '</div>';
      qnaModal.classList.remove('hidden');
      document.getElementById('qna-save-answer').addEventListener('click', function () {
        var text = document.getElementById('qna-answer-text').value.trim();
        qnaRef.doc(id).update({
          answer: { text: text, author: '정권혁', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }
        }).then(function () {
          qnaModal.classList.add('hidden');
          fetchQna();
        }).catch(function (err) { console.error(err); alert('저장에 실패했습니다.'); });
      });
    });
  }
  document.querySelectorAll('.qna-modal-close').forEach(function (el) {
    el.addEventListener('click', function () { qnaModal.classList.add('hidden'); });
  });
  qnaModal.querySelector('.modal-backdrop').addEventListener('click', function () { qnaModal.classList.add('hidden'); });
  qnaForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('qna-name').value.trim();
    var content = document.getElementById('qna-content').value.trim();
    var password = document.getElementById('qna-password').value;
    if (!name || !content || !password) return;
    qnaRef.add({
      name: name,
      content: content,
      password: password,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      document.getElementById('qna-form').reset();
      fetchQna();
    }).catch(function (err) { console.error(err); alert('등록에 실패했습니다.'); });
  });
  fetchQna();

  // ========== 날씨 위젯 ==========
  var CITY_STORAGE_KEY = 'weatherCity';
  var koreanToEnglish = {
    '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon', '광주': 'Gwangju',
    '대전': 'Daejeon', '울산': 'Ulsan', '세종': 'Sejong', '수원': 'Suwon', '성남': 'Seongnam',
    '고양': 'Goyang', '용인': 'Yongin', '창원': 'Changwon', '청주': 'Cheongju', '전주': 'Jeonju',
    '천안': 'Cheonan', '제주': 'Jeju', '제주시': 'Jeju City', '제주도': 'Jeju'
  };
  function normalizeCity(input) {
    var trim = (input || '').trim();
    if (!trim) return null;
    if (/[a-zA-Z]/.test(trim)) return trim;
    return koreanToEnglish[trim] || trim;
  }
  function loadWeatherCity() {
    var saved = localStorage.getItem(CITY_STORAGE_KEY);
    if (saved) {
      weatherCity.value = saved;
      fetchWeather(saved);
    }
  }
  function fetchWeather(cityInput) {
    var displayName = (cityInput || '').trim();
    if (!displayName) return;
    localStorage.setItem(CITY_STORAGE_KEY, displayName);
    weatherError.classList.add('hidden');
    weatherContent.classList.add('hidden');
    var q = normalizeCity(displayName) || displayName;
    var url = WEATHER_API_BASE + '?key=' + encodeURIComponent(WEATHER_API_KEY) + '&q=' + encodeURIComponent(q);
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          var code = data.error.code;
          if (code === 1006 || code === 1003) {
            var en = koreanToEnglish[displayName];
            if (en) {
              fetch(WEATHER_API_BASE + '?key=' + encodeURIComponent(WEATHER_API_KEY) + '&q=' + encodeURIComponent(en))
                .then(function (r) { return r.json(); })
                .then(function (d) {
                  if (d.error) showWeatherError(d.error.message);
                  else showWeather(d, displayName);
                }).catch(function () { showWeatherError('날씨를 불러오지 못했습니다.'); });
              return;
            }
          }
          showWeatherError(data.error.message || '날씨를 불러오지 못했습니다.');
          return;
        }
        showWeather(data, displayName);
      })
      .catch(function () {
        showWeatherError('날씨를 불러오지 못했습니다.');
      });
  }
  function showWeather(data, displayName) {
    var loc = data.location;
    var current = data.current;
    weatherLocation.textContent = displayName || (loc && loc.name) || '-';
    weatherDate.textContent = loc && loc.localtime ? loc.localtime : '-';
    weatherTemp.textContent = (current && current.temp_c != null) ? current.temp_c + '°C' : '-';
    var iconUrl = current && current.condition && current.condition.icon ? 'https:' + current.condition.icon : '';
    weatherIcon.src = iconUrl;
    weatherIcon.alt = (current && current.condition && current.condition.text) ? current.condition.text : '';
    weatherContent.classList.remove('hidden');
  }
  function showWeatherError(msg) {
    weatherError.textContent = msg;
    weatherError.classList.remove('hidden');
  }
  weatherBtn.addEventListener('click', function () {
    var city = weatherCity.value.trim();
    if (city) fetchWeather(city);
  });
  weatherCity.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (weatherCity.value.trim()) fetchWeather(weatherCity.value.trim());
    }
  });
  loadWeatherCity();

  // ========== 스타일 보조 ==========
  var styleSectionHeader = document.createElement('style');
  styleSectionHeader.textContent = '.section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; } .section-header .section-title { margin: 0; }';
  document.head.appendChild(styleSectionHeader);
})();
