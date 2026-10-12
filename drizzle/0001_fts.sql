-- Full-text search index. Rows are written by recipeRepo.save() and removed on delete.
CREATE VIRTUAL TABLE `recipes_fts` USING fts5(
  recipe_id UNINDEXED,
  title,
  description,
  ingredients,
  tags,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
