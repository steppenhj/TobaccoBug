import os
import sys

# app.py가 있는 my-flask-project/ 폴더를 경로에 추가
sys.path.insert(0, os.path.abspath('../..'))

# -- Project information -------------------------------------------------------

project = 'TobaccoBug'
copyright = '2026, Park Haejin'
author = 'Park Haejin'
release = '1.0.0'

# -- General configuration -----------------------------------------------------

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.viewcode',
]

autodoc_mock_imports = ['flask', 'flasgger']

templates_path = ['_templates']
exclude_patterns = []
language = 'ko'

# -- HTML output ---------------------------------------------------------------

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

html_theme_options = {
    'navigation_depth': 3,
    'titles_only': False,
}

html_context = {
    'display_github': True,
    'github_user': 'steppenhj',
    'github_repo': 'TobaccoBug',
    'github_version': 'main',
    'conf_py_path': '/my-flask-project/docs/source/',
}
